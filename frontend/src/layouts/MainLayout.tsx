import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  History,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PackageMinus,
  PackageOpen,
  Shield,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getMe } from '../api/axios';
import { useMaterials } from '../api/queries';
import ChatPanel from '../components/chat/ChatPanel';
import { useChatWorkspace } from '../components/chat/useChatWorkspace';
import type { MaterialDto, PagePermissionKey } from '../types/api';
import {
  clearAuthSession,
  getStoredEmail,
  getStoredName,
  getStoredRole,
  getStoredToken,
  hasStoredPagePermission,
  updateStoredProfile,
} from '../utils/auth-session';
import { clearMaterialWorklist } from '../utils/material-worklist';
import {
  hasGrantedLowStockNotificationPermission,
  isLowStockMaterial,
  notifyLowStock,
  requestLowStockNotificationPermission,
  supportsBrowserNotifications,
} from '../utils/stock-alerts';

interface NavItem {
  name: string;
  path: string;
  icon: React.FC<{ size?: number }>;
  shortName: string;
  permission?: PagePermissionKey;
}

const viewerNavItems: NavItem[] = [
  { name: '재고 대시보드', path: '/dashboard', icon: BarChart3, shortName: '대시', permission: 'DASHBOARD' },
  { name: '현재 재고', path: '/stock/current', icon: Layers, shortName: '재고', permission: 'CURRENT_STOCK' },
  { name: '재고 수불부', path: '/stock/ledger', icon: ClipboardList, shortName: '수불부', permission: 'STOCK_LEDGER' },
  { name: '변경 이력', path: '/history', icon: History, shortName: '이력', permission: 'HISTORY' },
];

const managerNavItems: NavItem[] = [
  { name: '입고 관리', path: '/inbound', icon: PackageOpen, shortName: '입고', permission: 'INBOUND' },
  { name: '출고 관리', path: '/outbound', icon: PackageMinus, shortName: '출고', permission: 'OUTBOUND' },
  { name: '월마감', path: '/closing', icon: Lock, shortName: '마감', permission: 'CLOSING' },
  { name: '사업장 관리', path: '/master-data', icon: Building2, shortName: '사업장', permission: 'MASTER_DATA' },
  { name: '자재 관리', path: '/materials', icon: Package, shortName: '자재', permission: 'MASTER_DATA' },
];

const superAdminNavItems: NavItem[] = [
  { name: '사용자 관리', path: '/admin/accounts', icon: Shield, shortName: '계정', permission: 'ADMIN_ACCOUNTS' },
];

const STORAGE_KEYS = {
  width: 'stk-chat-width',
  collapsed: 'stk-chat-collapsed',
};

const CHAT_WIDTH_BOUNDS = {
  min: 340,
  max: 520,
};

const CHAT_COLLAPSED_WIDTH = 64;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const chatWorkspace = useChatWorkspace();
  const userName = getStoredName();
  const userEmail = getStoredEmail();
  const userRole = getStoredRole();
  const navItems = [...viewerNavItems, ...managerNavItems, ...superAdminNavItems].filter(
    (item) => !item.permission || hasStoredPagePermission(item.permission),
  );
  const [permissionDenied, setPermissionDenied] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [chatMobileOpen, setChatMobileOpen] = useState<boolean>(false);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.collapsed);
    return stored == null ? false : stored === 'true';
  });
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const parsed = Number(localStorage.getItem(STORAGE_KEYS.width));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 400;
  });
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setPermissionDenied(detail?.message ?? '접근 권한이 없습니다.');
    };
    window.addEventListener('stk:permission-denied', handler);
    return () => window.removeEventListener('stk:permission-denied', handler);
  }, []);

  useEffect(() => {
    if (!permissionDenied) return;
    const timer = setTimeout(() => setPermissionDenied(null), 3000);
    return () => clearTimeout(timer);
  }, [permissionDenied]);

  useEffect(() => {
    let lastSyncAt = 0;
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!getStoredToken()) return;
      if (Date.now() - lastSyncAt < 30_000) return;
      lastSyncAt = Date.now();
      try {
        const profile = await getMe();
        updateStoredProfile(profile);
      } catch {
        // 401 is handled by interceptor, ignore others
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.collapsed, String(chatCollapsed));
  }, [chatCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.width, String(chatWidth));
  }, [chatWidth]);

  useLayoutEffect(() => {
    if (!location.pathname.startsWith('/stock/current')) {
      clearMaterialWorklist();
    }
  }, [location.pathname]);

  const { data: allMaterials = [] } = useMaterials();
  const lowStockMaterials = allMaterials.filter((m: MaterialDto) => isLowStockMaterial(m));
  const [lowStockDismissed, setLowStockDismissed] = useState<boolean>(false);
  const alertedLowStockCodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasGrantedLowStockNotificationPermission()) {
      alertedLowStockCodesRef.current = new Set(lowStockMaterials.map((material) => material.materialCode));
      return;
    }

    const nextCodes = new Set<string>();
    lowStockMaterials.forEach((material) => {
      nextCodes.add(material.materialCode);
      if (!alertedLowStockCodesRef.current.has(material.materialCode)) {
        notifyLowStock(material);
      }
    });
    alertedLowStockCodesRef.current = nextCodes;
  }, [lowStockMaterials]);

  const handleEnableLowStockNotifications = async () => {
    const permission = await requestLowStockNotificationPermission();
    if (permission === 'granted') {
      for (const material of lowStockMaterials) {
        notifyLowStock(material);
      }
    }
  };

  const currentPage = navItems.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/'),
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
        <div className="flex items-center gap-3">
          <img src="/stk-mark.svg" alt="STK-ENG 로고" className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-slate-900">STK-ENG</p>
            <p className="text-[11px] font-medium text-slate-400">Inventory System</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group flex items-center rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                isActive
                  ? 'bg-slate-900 font-medium text-white'
                  : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
                >
                  <item.icon size={20} />
                </span>
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="truncate text-xs font-bold text-slate-500">{userEmail}</p>
          {userRole === 'SUPER_ADMIN' && (
            <span className="mt-2 inline-flex rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              Super Admin
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate('/account/password')}
            className="mt-3 flex items-center text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            <KeyRound size={13} className="mr-1" />
            비밀번호 변경
          </button>
          <button
            type="button"
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
    <div className="flex h-screen overflow-hidden bg-[#f3f4f6] text-slate-800 font-sans">
      {permissionDenied && (
        <div className="fixed top-4 right-4 z-[300] animate-in fade-in slide-in-from-top-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700 shadow-lg">
          {permissionDenied}
        </div>
      )}

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          aria-label="사이드바 닫기"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {renderSidebarContent()}
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <img src="/stk-mark.svg" alt="STK-ENG 로고" className="hidden h-7 w-7 shrink-0 sm:block" />
            <div>
              <h1 className="text-sm font-semibold leading-tight text-slate-900">
                {currentPage?.name ?? '재고 관리 시스템'}
              </h1>
              <p className="hidden text-[10px] leading-tight text-slate-400 sm:block">STK-ENG</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="max-w-[220px] truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              {userName ? `${userName} · ${userEmail}` : userEmail}
            </span>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setChatMobileOpen(true)}
              className="chat-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50"
              aria-label="AI 채팅 열기"
            >
              <MessageCircle size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-[#f3f4f6] p-3 pb-4 md:p-6">
          {lowStockMaterials.length > 0 && !lowStockDismissed && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
              <span className="flex-1">
                <span className="font-bold text-amber-900">안전재고 경고:</span> {lowStockMaterials.length}개 자재의
                재고가 안전재고 이하입니다.
              </span>
              <button
                type="button"
                onClick={() => navigate('/stock/current?scope=LOW')}
                className="whitespace-nowrap rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200 transition-colors"
              >
                확인하기
              </button>
              {supportsBrowserNotifications() && !hasGrantedLowStockNotificationPermission() && (
                <button
                  type="button"
                  onClick={() => void handleEnableLowStockNotifications()}
                  className="whitespace-nowrap rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <Bell size={12} className="mr-1 inline-block" />웹 알림 켜기
                </button>
              )}
              <button
                type="button"
                onClick={() => setLowStockDismissed(true)}
                className="rounded-lg p-1 text-amber-500 hover:bg-amber-100 transition-colors"
                aria-label="닫기"
              >
                <X size={14} />
              </button>
            </div>
          )}
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
              workspace={chatWorkspace}
              mobileOpen={chatMobileOpen}
              onCloseMobile={() => setChatMobileOpen(false)}
              collapsed={chatCollapsed}
              onToggleCollapse={() => setChatCollapsed((current) => !current)}
              width={chatCollapsed ? CHAT_COLLAPSED_WIDTH : chatWidth}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
