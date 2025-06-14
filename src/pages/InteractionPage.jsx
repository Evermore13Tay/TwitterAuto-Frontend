import React, { useState, useEffect, useRef } from 'react';
import { Container, TextField, Button, Typography, Box, Paper, Checkbox, FormControlLabel, Grid, Slider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { API_BASE_URL } from '../config';

const InteractionPage = () => {
    const [deviceUsers, setDeviceUsers] = useState([]);
    const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());

    const [duration, setDuration] = useState(parseInt(localStorage.getItem('interaction_duration') || '160', 10));
    const [durationInput, setDurationInput] = useState(duration.toString());
    const [enableLiking, setEnableLiking] = useState(localStorage.getItem('interaction_enableLiking') === 'true' || true);
    const [enableCommenting, setEnableCommenting] = useState(localStorage.getItem('interaction_enableCommenting') === 'true');
    const [commentText, setCommentText] = useState(localStorage.getItem('interaction_commentText') || 'Nice one!');
    const [probInteractTweet, setProbInteractTweet] = useState(parseFloat(localStorage.getItem('interaction_probInteractTweet') || '0.3'));
    const [probLikeOpened, setProbLikeOpened] = useState(parseFloat(localStorage.getItem('interaction_probLikeOpened') || '0.6'));
    const [probCommentOpened, setProbCommentOpened] = useState(parseFloat(localStorage.getItem('interaction_probCommentOpened') || '0.4'));

    const [logs, setLogs] = useState([]);
    const [taskId, setTaskId] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const [completedDevicesCount, setCompletedDevicesCount] = useState(0);
    const [totalDevicesInBatch, setTotalDevicesInBatch] = useState(0);

    const ws = useRef(null);
    const logsEndRef = useRef(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [logs]);

    useEffect(() => {
        fetchDeviceUsers();
    }, []);

    useEffect(() => {
        localStorage.setItem('interaction_duration', duration.toString());
        localStorage.setItem('interaction_enableLiking', enableLiking.toString());
        localStorage.setItem('interaction_enableCommenting', enableCommenting.toString());
        localStorage.setItem('interaction_commentText', commentText);
        localStorage.setItem('interaction_probInteractTweet', probInteractTweet.toString());
        localStorage.setItem('interaction_probLikeOpened', probLikeOpened.toString());
        localStorage.setItem('interaction_probCommentOpened', probCommentOpened.toString());
    }, [duration, enableLiking, enableCommenting, commentText, probInteractTweet, probLikeOpened, probCommentOpened]);

    useEffect(() => {
        setDurationInput(duration.toString());
    }, [duration]);

    const fetchDeviceUsers = async () => {
        try {
            setLogs(prev => [...prev, 'Fetching device users...']);
            const response = await fetch(`${API_BASE_URL}/device-users`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch device users');
            }
            const data = await response.json();
            setDeviceUsers(data);
            setLogs(prev => [...prev, `Fetched ${data.length} device users.`]);
        } catch (err) {
            console.error('Error fetching device users:', err);
            setLogs(prev => [...prev, `Error fetching devices: ${err.message}`]);
            setError(`获取设备列表失败: ${err.message}`);
        }
    };

    const handleDeviceSelect = (deviceId) => {
        setSelectedDeviceIds(prevSelectedIds => {
            const newSelectedIds = new Set(prevSelectedIds);
            if (newSelectedIds.has(deviceId)) {
                newSelectedIds.delete(deviceId);
            } else {
                newSelectedIds.add(deviceId);
            }
            return newSelectedIds;
        });
    };
    
    const handleSelectAllDevices = (event) => {
        if (event.target.checked) {
            const allDeviceIds = new Set(deviceUsers.map(user => user.id));
            setSelectedDeviceIds(allDeviceIds);
        } else {
            setSelectedDeviceIds(new Set());
        }
    };

    useEffect(() => {
        if (taskId && isRunning && !ws.current) {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = window.location.hostname || 'localhost';
            const wsPort = '8000';
            const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws/${taskId}`;
            
            ws.current = new WebSocket(wsUrl);
            setLogs(prev => [...prev, `Connecting to WebSocket: ${wsUrl}`]);

            ws.current.onopen = () => {
                setLogs(prev => [...prev, 'WebSocket connection established.']);
            };

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const message = typeof data.message === 'object' ? JSON.stringify(data.message) : data.message;
                
                if (data.type === 'status' || data.type === 'info' || data.type === 'error') {
                    setLogs(prev => [...prev, `[${data.type?.toUpperCase()}] ${message}`]);
                } else if (data.type === 'device_completed') {
                    setCompletedDevicesCount(prev => {
                        const newCount = prev + 1;
                        if (totalDevicesInBatch > 0) {
                            setProgress(Math.round((newCount / totalDevicesInBatch) * 100));
                        }
                        return newCount;
                    });
                    setLogs(prev => [...prev, `[DEVICE_COMPLETED] ${message || 'A device finished processing.'}`]);
                } else if (data.type === 'completed') {
                    setLogs(prev => [...prev, `[BATCH_COMPLETED] ${message || 'Batch interaction fully completed.'}`]);
                    setProgress(100);
                    setIsRunning(false);
                    cleanupWebSocket();
                } else if (data.type === 'progress') {
                    setLogs(prev => [...prev, `[PROGRESS] Task ${data.task_id || ''}: ${data.value}%`]);
                } else {
                    setLogs(prev => [...prev, `WebSocket message: ${event.data}`]);
                }

                if (data.message?.toLowerCase().includes('failed') || data.type === 'error' || data.type === 'failed') {
                    if (data.type !== 'completed' && data.type !== 'device_completed') {
                        cleanupWebSocket();
                    }
                }
            };

            ws.current.onclose = () => {
                setLogs(prev => [...prev, 'WebSocket connection closed.']);
                setIsRunning(false); 
                ws.current = null;
            };

            ws.current.onerror = (error) => {
                const errorMsg = error.message || 'Unknown WebSocket error';
                setLogs(prev => [...prev, `WebSocket error: ${errorMsg}`]);
                console.error("WebSocket error:", error);
                setError(errorMsg);
                setIsRunning(false);
                cleanupWebSocket();
            };
        } else if (!isRunning && ws.current) {
            cleanupWebSocket();
        }

        return () => {
            cleanupWebSocket();
        };
    }, [taskId, isRunning, totalDevicesInBatch]);

    const cleanupWebSocket = () => {
        console.log('Cleaning up WebSocket resources');
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.close();
                setLogs(prev => [...prev, 'WebSocket connection closed.']);
            } catch (error) {
                console.error('Error closing WebSocket:', error);
            }
        }
        ws.current = null;
    };

    const handleStartInteraction = async () => {
        if (isRunning) {
            setLogs(prev => [...prev, 'An interaction task is already running.']);
            return;
        }
        setLogs(['Starting batch interaction...']);
        setIsRunning(true);
        setTaskId(null);
        setError(null);
        setProgress(0);
        setCompletedDevicesCount(0);
        setTotalDevicesInBatch(0);

        const interactionParams = {
            duration_seconds: parseInt(duration, 10),
            enable_liking: enableLiking,
            enable_commenting: enableCommenting,
            comment_text: commentText,
            prob_interact_tweet: parseFloat(probInteractTweet),
            prob_like_opened: parseFloat(probLikeOpened),
            prob_comment_opened: parseFloat(probCommentOpened),
        };

        const selectedDeviceObjects = deviceUsers.filter(user => selectedDeviceIds.has(user.id));
        if (selectedDeviceObjects.length === 0) {
            setLogs(prev => [...prev, 'Error: No devices selected for batch interaction.']);
            setError('Please select at least one device.');
            setIsRunning(false);
            return;
        }
        setTotalDevicesInBatch(selectedDeviceObjects.length);
        const endpoint = `${API_BASE_URL}/api/batch-run-interaction`; 
        const payload = { 
            devices: selectedDeviceObjects, 
            params: interactionParams 
        };
        setLogs(prev => [...prev, `Starting batch interaction for ${selectedDeviceObjects.length} devices...`]);
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok && data.task_id) {
                setLogs(prev => [...prev, `Task started successfully. Task ID: ${data.task_id}`]);
                setLogs(prev => [...prev, data.message || 'Task initiated. Waiting for WebSocket connection...']);
                setTaskId(data.task_id);
            } else {
                const errorMsg = data.detail || data.message || response.statusText || 'Failed to start task';
                setLogs(prev => [...prev, `Error starting task: ${errorMsg}`]);
                setError(errorMsg);
                setIsRunning(false);
            }
        } catch (err) {
            const errorMsg = err.message || 'Network or other error starting task.';
            setLogs(prev => [...prev, `Error: ${errorMsg}`]);
            setError(errorMsg);
            setIsRunning(false);
        }
    };

    const handleDurationChange = (e) => {
        // Allow any input during typing
        setDurationInput(e.target.value);
    };

    const handleDurationBlur = () => {
        // Apply constraints only when field loses focus
        const parsedValue = parseInt(durationInput, 10);
        if (isNaN(parsedValue)) {
            setDuration(10);
            return;
        }
        
        if (parsedValue < 10) {
            setDuration(10);
        } else if (parsedValue > 36000) {
            setDuration(36000);
        } else {
            setDuration(parsedValue);
        }
    };

    return (
        <Container maxWidth="lg">
            <Paper elevation={3} sx={{ padding: 3, marginTop: 3 }}>
                <Typography variant="h4" gutterBottom component="div" sx={{ textAlign: 'center' }}>
                    Twitter 养号交互功能
                </Typography>

                <Box sx={{ marginY: 2 }}>
                    <Typography variant="h6" gutterBottom>选择设备:</Typography>
                    <Button onClick={fetchDeviceUsers} disabled={isRunning} sx={{marginBottom: 1}}>Refresh Device List</Button>
                    <TableContainer component={Paper} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox 
                                            indeterminate={selectedDeviceIds.size > 0 && selectedDeviceIds.size < deviceUsers.length}
                                            checked={deviceUsers.length > 0 && selectedDeviceIds.size === deviceUsers.length}
                                            onChange={handleSelectAllDevices}
                                            disabled={isRunning || deviceUsers.length === 0}
                                        />
                                    </TableCell>
                                    <TableCell>Device Name</TableCell>
                                    <TableCell>IP Address</TableCell>
                                    <TableCell>Username</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deviceUsers.map((user) => (
                                    <TableRow 
                                        key={user.id} 
                                        hover 
                                        onClick={() => handleDeviceSelect(user.id)} 
                                        selected={selectedDeviceIds.has(user.id)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox checked={selectedDeviceIds.has(user.id)} disabled={isRunning} />
                                        </TableCell>
                                        <TableCell>{user.device_name}</TableCell>
                                        <TableCell>{user.device_ip}</TableCell>
                                        <TableCell>{user.username}</TableCell>
                                    </TableRow>
                                ))}
                                {deviceUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">No devices found. Add devices in Device Management or click Refresh.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
                
                <Box sx={{ border: '1px solid #ccc', padding: 2, borderRadius: 1, marginTop: 2 }}>
                    <Typography variant="h6" gutterBottom>参数修改</Typography>
                    <TextField 
                        label="刷帖(秒)" 
                        value={durationInput}
                        onChange={handleDurationChange}
                        onBlur={handleDurationBlur}
                        fullWidth 
                        margin="normal" 
                        type="number" 
                        disabled={isRunning} 
                        helperText="Min: 10s, Max: 36000s" 
                    />
                    <FormControlLabel control={<Checkbox checked={enableLiking} onChange={(e) => setEnableLiking(e.target.checked)} disabled={isRunning} />} label="启用点赞" />
                    <FormControlLabel control={<Checkbox checked={enableCommenting} onChange={(e) => setEnableCommenting(e.target.checked)} disabled={isRunning} />} label="启用评论" />
                    {enableCommenting && (
                        <TextField label="Comment Text" value={commentText} onChange={(e) => setCommentText(e.target.value)} fullWidth margin="normal" disabled={isRunning || !enableCommenting} multiline rows={2} />
                    )}
                </Box>

                <Box sx={{ border: '1px solid #ccc', padding: 2, borderRadius: 1, marginTop: 3 }}>
                    <Typography variant="h6" gutterBottom>随机概率设置（当前为信息展示）</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <Typography gutterBottom>点开详细页概率({probInteractTweet.toFixed(2)})</Typography>
                            <Slider value={probInteractTweet} onChange={(e, newValue) => setProbInteractTweet(newValue)} aria-labelledby="interact-tweet-slider" valueLabelDisplay="auto" step={0.01} marks min={0.0} max={1.0} disabled={isRunning} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography gutterBottom>点赞概率 ({probLikeOpened.toFixed(2)})</Typography>
                             <Slider value={probLikeOpened} onChange={(e, newValue) => setProbLikeOpened(newValue)} aria-labelledby="like-opened-slider" valueLabelDisplay="auto" step={0.01} marks min={0.0} max={1.0} disabled={isRunning} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography gutterBottom>评论概率 ({probCommentOpened.toFixed(2)})</Typography>
                             <Slider value={probCommentOpened} onChange={(e, newValue) => setProbCommentOpened(newValue)} aria-labelledby="comment-opened-slider" valueLabelDisplay="auto" step={0.01} marks min={0.0} max={1.0} disabled={isRunning} />
                        </Grid>
                    </Grid>
                </Box>

                <Button variant="contained" color="primary" onClick={handleStartInteraction} fullWidth sx={{ marginTop: 3, marginBottom: 2 }} disabled={isRunning}>
                    {isRunning ? 'Batch Interaction in Progress...' : 'Start Batch Interaction'}
                </Button>

                {error && (
                    <Typography color="error" sx={{ marginTop: 1, marginBottom: 1, textAlign: 'center' }}>
                        Error: {error}
                    </Typography>
                )}

                {(isRunning || logs.length > 0) && (
                    <Box sx={{marginTop: 2}}>
                        <Typography variant="h6" gutterBottom>Logs:</Typography>
                        {isRunning && (
                             <Box sx={{ width: '100%', marginBottom: 1 }}>
                                <Typography variant="caption">Batch Progress ({completedDevicesCount}/{totalDevicesInBatch} devices completed):</Typography>
                                <Slider value={progress} aria-label="Batch progress" valueLabelDisplay="auto" disabled sx={{ '& .MuiSlider-thumb': { display: 'none' } }} />
                            </Box>
                        )}
                        <Paper elevation={1} sx={{ maxHeight: '300px', overflow: 'auto', padding: 2, backgroundColor: '#f5f5f5' }}>
                            {logs.map((log, index) => (
                                <Typography key={index} variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                    {log}
                                </Typography>
                            ))}
                            <div ref={logsEndRef} />
                        </Paper>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default InteractionPage; 