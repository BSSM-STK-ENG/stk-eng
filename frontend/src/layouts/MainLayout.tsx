import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  PackageOpen, PackageMinus, Layers, ClipboardList,
  Lock, History, LogOut, Menu, X, ChevronRight
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.FC<{ size?: number }>;
  shortName: string;
}

const navItems: NavItem[] = [
  { name: '입고 관리',   path: '/inbound',       icon: PackageOpen,   shortName: '입고' },
  { name: '출고 관리',   path: '/outbound',      icon: PackageMinus,  shortName: '출고' },
  { name: '현재 재고',   path: '/stock/current', icon: Layers,        shortName: '재고' },
  { name: '재고 수불부', path: '/stock/ledger',  icon: ClipboardList, shortName: '수불부' },
  { name: '월마감',      path: '/closing',       icon: Lock,          shortName: '마감' },
  { name: '변경 이력',   path: '/history',       icon: History,       shortName: '이력' },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userEmail = localStorage.getItem('email') ?? '';
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/login');
  };

  const currentPage = navItems.find(item =>
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/')
  );

  const renderSidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Layers size={16} className="text-white" />
          </div>
          <span className="text-lg font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            STK Inventory
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">메뉴</p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group flex items-center px-3 py-2.5 rounded-xl transition-all duration-150 text-[13.5px] ${
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-bold shadow-sm ring-1 ring-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`mr-3 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  <item.icon size={20} />
                </span>
                {item.name}
                <ChevronRight
                  size={14}
                  className={`ml-auto transition-all ${isActive ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-50'}`}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-100 shrink-0">
        <div className="px-3 py-2.5 rounded-xl bg-slate-50">
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
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-slate-200/80 flex-col shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Sidebar — Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white/90 backdrop-blur-lg border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">
                {currentPage?.name ?? '재고 관리 시스템'}
              </h1>
              <p className="text-[10px] text-slate-400 leading-tight hidden sm:block">STK Inventory</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 bg-slate-100 rounded-full truncate max-w-[200px]">
              {userEmail}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <LogOut size={14} />
              로그아웃
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/20 p-3 md:p-6 pb-20 lg:pb-6">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Bottom Tab Bar — Mobile only */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200 safe-area-pb">
          <div className="grid grid-cols-6 h-16">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/');
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center gap-0.5 transition-colors"
                >
                  <span className={`transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    <item.icon size={20} />
                  </span>
                  <span className={`text-[9px] font-bold leading-tight ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    {item.shortName}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default MainLayout;
