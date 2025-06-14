import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import ChangeProfilePage from './ChangeProfilePage';
import ChangeSignaturePage from './ChangeSignaturePage';
import ChangeNicknamePage from './ChangeNicknamePage';

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

function AccountPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-semibold text-[var(--text-primary)]">账号设置</h1>
                <div className="flex flex-wrap gap-3">
                    <SubNavLink to="/account">修改头像</SubNavLink>
                    <SubNavLink to="/account/nickname">修改昵称</SubNavLink>
                    <SubNavLink to="/account/signature">修改签名</SubNavLink>
                </div>
            </div>
            
            <div className="apple-divider"></div>
            
            <div className="min-h-[70vh]">
                <Routes>
                    <Route path="/" element={<ChangeProfilePage />} />
                    <Route path="/nickname" element={<ChangeNicknamePage />} />
                    <Route path="/signature" element={<ChangeSignaturePage />} />
                    <Route path="*" element={<Navigate to="/account" replace />} />
                </Routes>
            </div>
        </div>
    );
}

export default AccountPage; 