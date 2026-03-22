import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  PackageOpen,
  PackageMinus,
  Layers,
  ClipboardList,
  Lock,
  History,
  LogOut,
  Menu,
  X,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import ChatPanel from '../components/chat/ChatPanel';

interface NavItem {
  name: string;
  path: string;
  icon: React.FC<{ size?: number }>;
  shortName: string;
}

const navItems: NavItem[] = [
  { name: '입고 관리', path: '/inbound', icon: PackageOpen, shortName: '입고' },
  { name: '출고 관리', path: '/outbound', icon: PackageMinus, shortName: '출고' },
  { name: '현재 재고', path: '/stock/current', icon: Layers, shortName: '재고' },
  { name: '재고 수불부', path: '/stock/ledger', icon: ClipboardList, shortName: '수불부' },
  { name: '월마감', path: '/closing', icon: Lock, shortName: '마감' },
  { name: '변경 이력', path: '/history', icon: History, shortName: '이력' },
];

const STORAGE_KEYS = {
  width: 'stk-chat-width',
  collapsed: 'stk-chat-collapsed',
};

const CHAT_WIDTH_BOUNDS = {
  min: 340,
  max: 520,
};

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userEmail = localStorage.getItem('email') ?? '';
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [chatMobileOpen, setChatMobileOpen] = useState<boolean>(false);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(() => localStorage.getItem(STORAGE_KEYS.collapsed) === 'true');
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const parsed = Number(localStorage.getItem(STORAGE_KEYS.width));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 400;
  });
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/login');
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.collapsed, String(chatCollapsed));
  }, [chatCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.width, String(chatWidth));
  }, [chatWidth]);

  const currentPage = navItems.find(item =>
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/')
  );

  const handleChatResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (chatCollapsed || event.button !== 0) {
      return;
    }

    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: chatWidth,
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (moveEvent: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) {
        return;
      }

      const delta = state.startX - moveEvent.clientX;
      const nextWidth = Math.min(
        CHAT_WIDTH_BOUNDS.max,
        Math.max(CHAT_WIDTH_BOUNDS.min, Math.round(state.startWidth + delta)),
      );
      setChatWidth(nextWidth);
    };

    const onUp = () => {
      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const renderSidebarContent = () => (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-slate-200/80 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30">
            <Layers size={16} className="text-white" />
          </div>
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            STK Inventory
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">메뉴</p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group flex items-center rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 font-bold text-blue-700 shadow-sm ring-1 ring-blue-100'
                  : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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

      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="truncate text-xs font-bold text-slate-500">{userEmail}</p>
          <button
            onClick={handleLogout}
            className="mt-1.5 flex items-center text-xs font-semibold text-slate-400 transition-colors hover:text-red-500"
          >
            <LogOut size={13} className="mr-1" />
            로그아웃
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fafc_0%,#f8fbff_50%,#eef4ff_100%)] text-slate-800 font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex">
        {renderSidebarContent()}
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-lg md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-sm font-bold leading-tight text-slate-800">
                {currentPage?.name ?? '재고 관리 시스템'}
              </h1>
              <p className="hidden text-[10px] leading-tight text-slate-400 sm:block">STK Inventory</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="max-w-[200px] truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {userEmail}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <LogOut size={14} />
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50/70 via-white/60 to-blue-50/30 p-3 pb-20 md:p-6 lg:pb-6">
          <div className="mx-auto flex h-full min-w-0 max-w-[1760px] gap-0">
            <div className="chat-scrollbar min-w-0 flex-1 overflow-y-auto">
              <Outlet />
            </div>

            <div
              className={`hidden w-2 shrink-0 cursor-col-resize lg:block ${chatCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
              onPointerDown={handleChatResizePointerDown}
              aria-hidden="true"
            >
              <div className="mx-auto h-full w-px rounded-full bg-slate-200 transition-colors hover:bg-blue-400" />
            </div>

            <ChatPanel
              mobileOpen={chatMobileOpen}
              onCloseMobile={() => setChatMobileOpen(false)}
              collapsed={chatCollapsed}
              onToggleCollapse={() => setChatCollapsed((current) => !current)}
              width={chatCollapsed ? 76 : chatWidth}
            />
          </div>
        </main>

        <button
          type="button"
          onClick={() => setChatMobileOpen(true)}
          className="fixed bottom-20 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_16px_40px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 lg:hidden"
          aria-label="채팅 열기"
        >
          <MessageCircle size={22} />
        </button>

        <nav className="safe-area-pb fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-lg lg:hidden">
          <div className="grid h-16 grid-cols-6">
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
                    <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-blue-600" />
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
