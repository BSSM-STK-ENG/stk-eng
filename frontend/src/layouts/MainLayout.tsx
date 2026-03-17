import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { PackageOpen, PackageMinus, Layers, ClipboardList, Lock, History, LogOut, Menu, X, ChevronRight } from 'lucide-react';

interface NavItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    color: string;
}

const MainLayout = () => {
    const navigate = useNavigate();
    const userEmail = localStorage.getItem('email');
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        navigate('/login');
    };

    const navItems: NavItem[] = [
        { name: '입고 관리', path: '/inbound', icon: <PackageOpen size={20} />, color: 'blue' },
        { name: '출고 관리', path: '/outbound', icon: <PackageMinus size={20} />, color: 'rose' },
        { name: '현재 재고', path: '/stock/current', icon: <Layers size={20} />, color: 'emerald' },
        { name: '재고 수불부', path: '/stock/ledger', icon: <ClipboardList size={20} />, color: 'amber' },
        { name: '월마감', path: '/closing', icon: <Lock size={20} />, color: 'purple' },
        { name: '변경 이력', path: '/history', icon: <History size={20} />, color: 'indigo' },
    ];

    const renderSidebar = () => (
        <>
            <div className="h-16 flex items-center px-5 border-b border-slate-200/80 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <Layers size={16} className="text-white" />
                    </div>
                    <span className="text-lg font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                        STK Inventory
                    </span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
                <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">메뉴</p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }: { isActive: boolean }) =>
                            `group flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 text-[13.5px] ${
                                isActive
                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-bold shadow-sm ring-1 ring-blue-100'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                            }`
                        }
                    >
                        {({ isActive }: { isActive: boolean }) => (
                            <>
                                <span className={`mr-3 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>{item.icon}</span>
                                {item.name}
                                <ChevronRight size={14} className={`ml-auto transition-all ${isActive ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-50'}`} />
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            <div className="p-3 border-t border-slate-100 shrink-0">
                <div className="px-3 py-2 rounded-xl bg-slate-50">
                    <p className="text-xs font-bold text-slate-500 truncate">{userEmail}</p>
                    <button
                        onClick={handleLogout}
                        className="mt-1.5 flex items-center text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <LogOut size={13} className="mr-1" />
                        로그아웃
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar — Desktop */}
            <div className="hidden lg:flex w-60 bg-white border-r border-slate-200/80 flex-col shrink-0">
                {renderSidebar()}
            </div>

            {/* Sidebar — Mobile */}
            <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {renderSidebar()}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Topbar */}
                <header className="h-14 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                            <Menu size={20} />
                        </button>
                        <h1 className="text-sm md:text-base font-bold text-slate-700 tracking-tight">재고 관리 시스템</h1>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 bg-slate-100 rounded-full">
                            {userEmail}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="flex items-center text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <LogOut size={15} className="mr-1" />
                            로그아웃
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/20 p-3 md:p-6">
                    <div className="max-w-[1400px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
