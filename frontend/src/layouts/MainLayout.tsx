import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Package,
  PackageOpen,
  PackageMinus,
  Layers,
  ClipboardList,
  KeyRound,
  Lock,
  History,
  LogOut,
  Menu,
  X,
  MessageCircle,
  Shield,
} from 'lucide-react';
import ChatPanel from '../components/chat/ChatPanel';
import { useChatWorkspace } from '../components/chat/useChatWorkspace';
import type { PagePermissionKey } from '../types/api';
import { clearAuthSession, getStoredEmail, getStoredName, getStoredRole, hasStoredPagePermission } from '../utils/auth-session';
import { getAiPreferences, saveAiPreferences } from '../api/chat';
import type { AiPreferences } from '../types/chat';
import { clearMaterialWorklist } from '../utils/material-worklist';

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
  visibilityPrefix: 'stk-chat-visible',
};

const CHAT_WIDTH_BOUNDS = {
  min: 340,
  max: 520,
};

const CHAT_COLLAPSED_WIDTH = 64;

function getChatVisibilityStorageKey(email: string) {
  return `${STORAGE_KEYS.visibilityPrefix}:${email || 'anonymous'}`;
}

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const chatWorkspace = useChatWorkspace();
  const userName = getStoredName();
  const userEmail = getStoredEmail();
  const userRole = getStoredRole();
  const chatVisibilityStorageKey = getChatVisibilityStorageKey(userEmail);
  const navItems = [
    ...viewerNavItems,
    ...managerNavItems,
    ...superAdminNavItems,
  ].filter((item) => !item.permission || hasStoredPagePermission(item.permission));
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [chatMobileOpen, setChatMobileOpen] = useState<boolean>(false);
  const [chatPreferences, setChatPreferences] = useState<AiPreferences | null>(null);
  const [chatPanelEnabled, setChatPanelEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(getChatVisibilityStorageKey(getStoredEmail()));
    return stored == null ? false : stored === 'true';
  });
  const [chatPreferencesSaving, setChatPreferencesSaving] = useState<boolean>(false);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.collapsed);
    return stored == null ? true : stored === 'true';
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
    localStorage.setItem(STORAGE_KEYS.collapsed, String(chatCollapsed));
  }, [chatCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.width, String(chatWidth));
  }, [chatWidth]);

  useEffect(() => {
    localStorage.setItem(chatVisibilityStorageKey, String(chatPanelEnabled));
  }, [chatPanelEnabled, chatVisibilityStorageKey]);

  useEffect(() => {
    let mounted = true;

    const syncPreferences = async () => {
      try {
        const preferences = await getAiPreferences();
        if (!mounted || !preferences) {
          return;
        }
        setChatPreferences(preferences);
        setChatPanelEnabled(preferences.chatPanelEnabled);
        if (!preferences.chatPanelEnabled) {
          setChatMobileOpen(false);
          setChatCollapsed(true);
        }
      } catch {
        // Keep the last known local preference when the API is unavailable.
      }
    };

    void syncPreferences();

    return () => {
      mounted = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!location.pathname.startsWith('/stock/current')) {
      clearMaterialWorklist();
    }
  }, [location.pathname]);

  const currentPage = navItems.find(item =>
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/')
  );

  const handleChatResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!chatPanelEnabled || chatCollapsed || event.button !== 0) {
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

  const handleChatPreferencesChange = (next: AiPreferences) => {
    setChatPreferences(next);
    setChatPanelEnabled(next.chatPanelEnabled);
    if (!next.chatPanelEnabled) {
      setChatMobileOpen(false);
      setChatCollapsed(true);
    }
  };

  const handleEnableChatPanel = async () => {
    const currentPreferences = chatPreferences
      ?? await getAiPreferences().catch(() => null)
      ?? { provider: 'openai', model: 'gpt-5', chatPanelEnabled: false };

    setChatPreferencesSaving(true);
    try {
      const saved = await saveAiPreferences({
        provider: currentPreferences.provider,
        model: currentPreferences.model,
        chatPanelEnabled: true,
      });
      if (saved) {
        setChatPreferences(saved);
        setChatPanelEnabled(saved.chatPanelEnabled);
      }
    } finally {
      setChatPreferencesSaving(false);
    }
  };

  const renderSidebarContent = () => (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-slate-200/80 px-5">
        <div className="flex items-center gap-3">
          <img
            src="/stk-mark.svg"
            alt="STK-ENG 로고"
            className="h-8 w-8 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-slate-900">STK-ENG</p>
            <p className="text-[11px] font-medium text-slate-400">Inventory System</p>
          </div>
        </div>
        <button
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
                <span className={`mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
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
            onClick={() => navigate('/account/password')}
            className="mt-3 flex items-center text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            <KeyRound size={13} className="mr-1" />
            비밀번호 변경
          </button>
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
    <div className="flex h-screen overflow-hidden bg-[#f3f4f6] text-slate-800 font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
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
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <img
              src="/stk-mark.svg"
              alt="STK-ENG 로고"
              className="hidden h-7 w-7 shrink-0 sm:block"
            />
            <div>
              <h1 className="text-sm font-semibold leading-tight text-slate-900">
                {currentPage?.name ?? '재고 관리 시스템'}
              </h1>
              <p className="hidden text-[10px] leading-tight text-slate-400 sm:block">STK-ENG</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {!chatPanelEnabled && (
              <button
                type="button"
                onClick={() => void handleEnableChatPanel()}
                disabled={chatPreferencesSaving}
                className="chat-focus-ring flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MessageCircle size={14} />
                {chatPreferencesSaving ? 'AI 켜는 중...' : 'AI 패널 켜기'}
              </button>
            )}
            <span className="max-w-[220px] truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              {userName ? `${userName} · ${userEmail}` : userEmail}
            </span>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {chatPanelEnabled ? (
              <button
                type="button"
                onClick={() => setChatMobileOpen(true)}
                className="chat-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50"
                aria-label="AI 채팅 열기"
              >
                <MessageCircle size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleEnableChatPanel()}
                disabled={chatPreferencesSaving}
                className="chat-focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MessageCircle size={14} />
                {chatPreferencesSaving ? 'AI 켜는 중...' : 'AI 켜기'}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-[#f3f4f6] p-3 pb-4 md:p-6">
          <div className="mx-auto flex h-full min-w-0 max-w-[1760px] gap-0">
            <div className="chat-scrollbar min-w-0 flex-1 overflow-y-auto">
              <Outlet />
            </div>

            {chatPanelEnabled && (
              <>
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
                  onPreferencesChange={handleChatPreferencesChange}
                />
              </>
            )}
          </div>
        </main>

      </div>
    </div>
  );
};

export default MainLayout;
