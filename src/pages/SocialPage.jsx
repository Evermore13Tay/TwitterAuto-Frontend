import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import AccountsPage from './AccountsPage';
import SimpleAccountsPage from './SimpleAccountsPage';

// 子导航链接组件
function SubNavLink({ to, children }) {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    return (
        <Link
            to={to}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                isActive 
                ? 'bg-[var(--primary-color)] text-white' 
                : 'bg-[#f5f5f7] text-[var(--text-primary)] hover:bg-[#e9e9eb]'
            }`}
        >
            {children}
        </Link>
    );
}

// 功能卡片组件
function FeatureCard({ title, description, to, icon }) {
    return (
        <Link to={to} className="apple-card p-6 hover:bg-[#f9f9fc] transition-colors">
            <div className="flex items-start">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--primary-color)] bg-opacity-10 text-[var(--primary-color)] text-xl mr-4">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                    <p className="text-[var(--text-secondary)] text-sm">{description}</p>
                </div>
            </div>
        </Link>
    );
}

function SocialPage() {
    const location = useLocation();
    const isHome = location.pathname === '/social';
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-semibold text-[var(--text-primary)]">社交功能</h1>
                {!isHome && (
                    <div className="flex flex-wrap gap-3">
                        <SubNavLink to="/social">功能概览</SubNavLink>
                        <SubNavLink to="/social/accounts">账号</SubNavLink>
                        {/* 以下功能暂时不可用，组件已移动到NoUse文件夹 */}
                        {/* <SubNavLink to="/social/interaction">互动功能</SubNavLink>
                        <SubNavLink to="/social/follow">关注用户</SubNavLink>
                        <SubNavLink to="/social/tweet">发布推文</SubNavLink> */}
                    </div>
                )}
            </div>
            
            <div className="apple-divider"></div>
            
            <Routes>
                <Route path="/" element={<SocialHome />} />
                <Route path="/accounts" element={<SimpleAccountsPage />} />
                {/* 以下路由暂时不可用，组件已移动到NoUse文件夹 */}
                {/* <Route path="/interaction" element={<InteractionPage />} />
                <Route path="/follow" element={<FollowUserPage />} />
                <Route path="/tweet" element={<PostTweetPage />} /> */}
                <Route path="*" element={<Navigate to="/social" replace />} />
            </Routes>
        </div>
    );
}

// 社交功能主页（功能概览）
function SocialHome() {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FeatureCard 
                    title="账号" 
                    description="管理Twitter账号和2FA密钥" 
                    to="/social/accounts"
                    icon="👤"
                />
                <FeatureCard 
                    title="互动功能" 
                    description="喜欢、转发、评论等互动操作" 
                    to="/social/interaction"
                    icon="💬"
                />
                <FeatureCard 
                    title="关注用户" 
                    description="批量关注目标用户" 
                    to="/social/follow"
                    icon="👥"
                />
                <FeatureCard 
                    title="发布推文" 
                    description="创建并发布文字和图片推文" 
                    to="/social/tweet"
                    icon="📝"
                />
            </div>
            
            <div className="apple-card p-6">
                <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">快速指南</h2>
                <div className="space-y-4">
                    <div className="flex items-start">
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--primary-color)] text-white text-xs mr-3 mt-0.5 flex-shrink-0">1</div>
                        <p className="text-[var(--text-secondary)]">在设备管理页面添加并管理您的设备</p>
                    </div>
                    <div className="flex items-start">
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--primary-color)] text-white text-xs mr-3 mt-0.5 flex-shrink-0">2</div>
                        <p className="text-[var(--text-secondary)]">使用账号设置页面自定义您的账号资料</p>
                    </div>
                    <div className="flex items-start">
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--primary-color)] text-white text-xs mr-3 mt-0.5 flex-shrink-0">3</div>
                        <p className="text-[var(--text-secondary)]">选择上方功能，开始执行社交互动操作</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SocialPage; 