import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DeviceManagePage from '../DeviceManagePage';

function DevicesPage() {
    return (
        <div className="space-y-6">
            <Routes>
                <Route path="/" element={<DeviceManagePage />} />
                <Route path="*" element={<Navigate to="/devices" replace />} />
            </Routes>
        </div>
    );
}

export default DevicesPage; 