import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck, CheckCheck, Copy, Loader2, Plus, RefreshCw, RotateCcw, Settings2, Shield, Trash2, UserPlus, X } from 'lucide-react';
import api from '../api/axios';
import type {
  AdminCreatePermissionPresetRequest,
  AdminCreateRoleProfileRequest,
  AdminCreateUserRequest,
  AdminCreatedUserResponse,
  AdminPermissionOptionsResponse,
  AdminPasswordResetResponse,
  AdminUpdateUserPermissionsRequest,
  AdminUpdateUserNameRequest,
  AdminUserSummary,
  Role,
  PagePermissionKey,
} from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { getStoredEmail } from '../utils/auth-session';
import { formatAppDateTime } from '../utils/date-format';

const ROLE_OPTIONS: Array<AdminCreateUserRequest['role']> = ['USER', 'ADMIN'];

const ROLE_LABELS: Record<AdminUserSummary['role'], string> = {
  USER: '일반 사용자',
  ADMIN: '관리자',
  SUPER_ADMIN: '슈퍼 어드민',
};

interface FlashMessage {
  kind: 'success' | 'error';
  title: string;
  description?: string;
  credentials?: {
    email: string;
    temporaryPassword: string;
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '방금 생성';
  }
  return formatAppDateTime(value);
}

const AdminAccounts = () => {
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const currentUserEmail = getStoredEmail();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'credentials' | null>(null);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [permissionOptions, setPermissionOptions] = useState<AdminPermissionOptionsResponse | null>(null);
  const [permissionModalUser, setPermissionModalUser] = useState<AdminUserSummary | null>(null);
  const [permissionPresetDraft, setPermissionPresetDraft] = useState<string>('VIEWER');
  const [permissionDrafts, setPermissionDrafts] = useState<PagePermissionKey[]>([]);
  const [managingUserId, setManagingUserId] = useState<string | null>(null);
  const [presetFormOpen, setPresetFormOpen] = useState(false);
  const [presetSubmitting, setPresetSubmitting] = useState(false);
  const [presetProcessingKey, setPresetProcessingKey] = useState<string | null>(null);
  const [presetForm, setPresetForm] = useState<{ label: string; description: string }>({ label: '', description: '' });
  const [roleProfileModalOpen, setRoleProfileModalOpen] = useState(false);
  const [roleProfileSubmitting, setRoleProfileSubmitting] = useState(false);
  const [roleProfileProcessingKey, setRoleProfileProcessingKey] = useState<string | null>(null);
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [roleProfileForm, setRoleProfileForm] = useState<AdminCreateRoleProfileRequest>({
    label: '',
    description: '',
    baseRole: 'USER',
  });
  const [form, setForm] = useState<AdminCreateUserRequest>({
    name: '',
    email: '',
    role: 'USER',
    roleProfileKey: 'USER',
    permissionPreset: 'VIEWER',
  });

  const getDefaultPresetKeyForRole = (role: AdminUserSummary['role'] | AdminCreateUserRequest['role']) =>
    role === 'ADMIN' ? 'OPERATOR' : 'VIEWER';

  const getRoleProfiles = () => (permissionOptions?.roleProfiles ?? []).filter((profile) => profile.baseRole !== 'SUPER_ADMIN');

  const getRoleProfile = (roleProfileKey: string | null | undefined) =>
    getRoleProfiles().find((profile) => profile.key === roleProfileKey);

  const managingUser = managingUserId ? users.find((user) => user.id === managingUserId) ?? null : null;

  const getDefaultPresetKeyForRoleProfile = (roleProfileKey: string | null | undefined, fallbackRole: AdminUserSummary['role'] | AdminCreateUserRequest['role']) =>
    getDefaultPresetKeyForRole(getRoleProfile(roleProfileKey)?.baseRole ?? fallbackRole);

  const copyText = async (text: string, field: 'email' | 'credentials') => {
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy();
      }
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1800);
    } catch {
      setFlash({
        kind: 'error',
        title: '클립보드 복사에 실패했습니다.',
        description: '브라우저 권한을 확인해주세요.',
      });
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<AdminUserSummary[]>('/admin/users');
      setUsers(response.data);
      setNameDrafts(Object.fromEntries(response.data.map((user) => [user.id, user.name ?? ''])));
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '사용자 목록을 불러오지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const loadPermissionOptions = async (silent = false) => {
    try {
      const response = await api.get<AdminPermissionOptionsResponse>('/admin/users/permission-options');
      setPermissionOptions(response.data);
      setForm((current) => {
        const resolvedRoleProfileKey = current.roleProfileKey
          ?? (response.data.roleProfiles ?? []).find((profile) => profile.key === current.role)?.key
          ?? 'USER';
        return {
          ...current,
          roleProfileKey: resolvedRoleProfileKey,
          permissionPreset: current.permissionPreset ?? getDefaultPresetKeyForRoleProfile(resolvedRoleProfileKey, current.role),
        };
      });
      return response.data;
    } catch (error) {
      if (!silent) {
        setFlash({
          kind: 'error',
          title: '권한 프리셋을 불러오지 못했습니다.',
          description: getErrorMessage(error),
        });
      }
      return null;
    }
  };

  useEffect(() => {
    void loadPermissionOptions();
  }, []);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFlash(null);

    try {
      const response = await api.post<AdminCreatedUserResponse>('/admin/users', form);
      setForm({
        name: '',
        email: '',
        role: form.role,
        roleProfileKey: form.roleProfileKey,
        permissionPreset: form.permissionPreset,
      });
      setFlash({
        kind: 'success',
        title: '계정을 발급했습니다.',
        description: '사용자는 초기 비밀번호로 로그인한 뒤 첫 화면에서 비밀번호를 변경해야 합니다.',
        credentials: {
          email: response.data.email,
          temporaryPassword: response.data.temporaryPassword,
        },
      });
      await loadUsers();
      window.setTimeout(() => emailInputRef.current?.focus(), 0);
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '계정을 발급하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (user: AdminUserSummary, roleProfileKey: string) => {
    if ((user.roleProfileKey ?? user.role) === roleProfileKey) {
      return;
    }

    setProcessingUserId(user.id);
    setFlash(null);
    try {
      const targetProfile = getRoleProfile(roleProfileKey);
      const response = await api.put<AdminUserSummary>(`/admin/users/${user.id}/role`, {
        roleProfileKey,
        role: (targetProfile?.baseRole ?? user.role) as Exclude<Role, 'SUPER_ADMIN'>,
      });
      setUsers((current) => current.map((item) => (item.id === user.id ? response.data : item)));
      setFlash({
        kind: 'success',
        title: '권한을 변경했습니다.',
        description: `${user.email} 계정은 이제 ${response.data.roleLabel ?? ROLE_LABELS[response.data.role]} 권한을 사용합니다.`,
      });
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '권한을 변경하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleNameSave = async (user: AdminUserSummary) => {
    const name = (nameDrafts[user.id] ?? '').trim();
    if (!name) {
      setFlash({
        kind: 'error',
        title: '이름을 입력해주세요.',
      });
      return;
    }

    if (name === (user.name ?? '')) {
      return;
    }

    setProcessingUserId(user.id);
    setFlash(null);
    try {
      const response = await api.put<AdminUserSummary, { data: AdminUserSummary }, AdminUpdateUserNameRequest>(`/admin/users/${user.id}/name`, { name });
      setUsers((current) => current.map((item) => (item.id === user.id ? response.data : item)));
      setNameDrafts((current) => ({ ...current, [user.id]: response.data.name ?? '' }));
      setFlash({
        kind: 'success',
        title: '사용자 이름을 변경했습니다.',
        description: `${response.data.email} 계정의 이름을 ${response.data.name}으로 저장했습니다.`,
      });
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '사용자 이름을 변경하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleResetPassword = async (user: AdminUserSummary) => {
    setProcessingUserId(user.id);
    setFlash(null);
    try {
      const response = await api.post<AdminPasswordResetResponse>(`/admin/users/${user.id}/reset-password`);
      setUsers((current) =>
        current.map((item) => (
          item.id === user.id
            ? { ...item, passwordChangeRequired: response.data.passwordChangeRequired }
            : item
        )),
      );
      setFlash({
        kind: 'success',
        title: '초기 비밀번호로 재설정했습니다.',
        description: '다음 로그인 시 새 비밀번호 설정이 다시 필요합니다.',
        credentials: {
          email: response.data.email,
          temporaryPassword: response.data.temporaryPassword,
        },
      });
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '비밀번호를 재설정하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserSummary) => {
    const confirmed = window.confirm(`${user.email} 계정을 삭제하시겠습니까?\n이미 거래나 마감 이력에 사용된 계정은 삭제되지 않습니다.`);
    if (!confirmed) {
      return;
    }

    setProcessingUserId(user.id);
    setFlash(null);
    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setNameDrafts((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setFlash({
        kind: 'success',
        title: '사용자 계정을 삭제했습니다.',
        description: `${user.email} 계정을 목록에서 제거했습니다.`,
      });
      if (managingUserId === user.id) {
        setManagingUserId(null);
      }
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '사용자 계정을 삭제하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const openPermissionModal = (user: AdminUserSummary) => {
    setPermissionModalUser(user);
    setPermissionPresetDraft(user.permissionPreset ?? 'VIEWER');
    setPermissionDrafts(user.pagePermissions ?? []);
    setPresetFormOpen(false);
    setPresetForm({ label: '', description: '' });
    setFlash(null);
  };

  const applyPresetDraft = (presetKey: string, options = permissionOptions) => {
    setPermissionPresetDraft(presetKey);
    const preset = options?.presets.find((item) => item.key === presetKey);
    if (preset) {
      setPermissionDrafts(preset.pagePermissions);
    }
  };

  const togglePermissionDraft = (permission: PagePermissionKey) => {
    setPermissionDrafts((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  const handleSavePermissions = async () => {
    if (!permissionModalUser) {
      return;
    }

    setProcessingUserId(permissionModalUser.id);
    setFlash(null);
    try {
      const response = await api.put<AdminUserSummary, { data: AdminUserSummary }, AdminUpdateUserPermissionsRequest>(
        `/admin/users/${permissionModalUser.id}/permissions`,
        {
          permissionPreset: permissionPresetDraft,
          pagePermissions: permissionDrafts,
        },
      );
      setUsers((current) => current.map((item) => (item.id === response.data.id ? response.data : item)));
      setPermissionModalUser(null);
      setFlash({
        kind: 'success',
        title: '페이지 권한을 저장했습니다.',
        description: `${response.data.email} 계정의 접근 페이지를 업데이트했습니다.`,
      });
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '페이지 권한을 저장하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const resolvePresetLabel = (presetKey: string | null) =>
    permissionOptions?.presets.find((item) => item.key === presetKey)?.label ?? presetKey ?? '권한 미설정';

  const getUserStatus = (user: AdminUserSummary) => {
    if (!user.emailVerified) {
      return {
        label: '이메일 인증 대기',
        className: 'bg-slate-100 text-slate-700',
      };
    }

    if (user.passwordChangeRequired) {
      return {
        label: '초기 비밀번호 변경 필요',
        className: 'bg-slate-100 text-slate-700',
      };
    }

    return {
      label: '활성',
      className: 'bg-slate-900 text-white',
    };
  };

  const handleCreatePermissionPreset = async () => {
    if (permissionDrafts.length === 0) {
      setFlash({
        kind: 'error',
        title: '프리셋에 포함할 페이지를 하나 이상 선택해주세요.',
      });
      return;
    }

    setPresetSubmitting(true);
    setFlash(null);
    try {
      const response = await api.post<AdminPermissionOptionsResponse['presets'][number], { data: AdminPermissionOptionsResponse['presets'][number] }, AdminCreatePermissionPresetRequest>(
        '/admin/users/permission-presets',
        {
          label: presetForm.label,
          description: presetForm.description.trim() || undefined,
          pagePermissions: permissionDrafts,
        },
      );
      const nextOptions = await loadPermissionOptions(true);
      if (nextOptions) {
        applyPresetDraft(response.data.key, nextOptions);
      }
      setPresetFormOpen(false);
      setPresetForm({ label: '', description: '' });
      setFlash({
        kind: 'success',
        title: '새 권한 프리셋을 저장했습니다.',
        description: `${response.data.label} 프리셋을 바로 사용할 수 있습니다.`,
      });
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '권한 프리셋을 저장하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setPresetSubmitting(false);
    }
  };

  const handleDeletePermissionPreset = async (presetKey: string) => {
    const targetPreset = permissionOptions?.presets.find((preset) => preset.key === presetKey);
    if (!targetPreset || targetPreset.systemPreset) {
      return;
    }

    const confirmed = window.confirm(`${targetPreset.label} 프리셋을 삭제하시겠습니까? 사용 중인 프리셋은 삭제되지 않습니다.`);
    if (!confirmed) {
      return;
    }

    setPresetProcessingKey(presetKey);
    setFlash(null);
    try {
      await api.delete(`/admin/users/permission-presets/${presetKey}`);
      const nextOptions = await loadPermissionOptions(true);
      if (nextOptions && permissionPresetDraft === presetKey) {
        applyPresetDraft(getDefaultPresetKeyForRole(permissionModalUser?.role ?? form.role), nextOptions);
      }
      if (form.permissionPreset === presetKey) {
        setForm((current) => ({ ...current, permissionPreset: getDefaultPresetKeyForRole(current.role) }));
      }
      setFlash({
        kind: 'success',
        title: '권한 프리셋을 삭제했습니다.',
      });
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '권한 프리셋을 삭제하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setPresetProcessingKey(null);
    }
  };

  const handleCreateRoleProfile = async () => {
    setRoleProfileSubmitting(true);
    setFlash(null);
    try {
      const response = await api.post<AdminPermissionOptionsResponse['roleProfiles'][number], { data: AdminPermissionOptionsResponse['roleProfiles'][number] }, AdminCreateRoleProfileRequest>(
        '/admin/users/role-profiles',
        roleProfileForm,
      );
      const nextOptions = await loadPermissionOptions(true);
      if (nextOptions) {
        setForm((current) => ({
          ...current,
          role: response.data.baseRole as Exclude<Role, 'SUPER_ADMIN'>,
          roleProfileKey: response.data.key,
          permissionPreset: getDefaultPresetKeyForRole(response.data.baseRole),
        }));
      }
      setRoleProfileModalOpen(false);
      setRoleProfileForm({ label: '', description: '', baseRole: 'USER' });
      setFlash({
        kind: 'success',
        title: '새 권한 역할을 저장했습니다.',
        description: `${response.data.label} 역할을 바로 사용할 수 있습니다.`,
      });
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '권한 역할을 저장하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setRoleProfileSubmitting(false);
    }
  };

  const handleDeleteRoleProfile = async (roleProfileKey: string) => {
    const targetRoleProfile = permissionOptions?.roleProfiles.find((profile) => profile.key === roleProfileKey);
    if (!targetRoleProfile || targetRoleProfile.systemProfile) {
      return;
    }

    const confirmed = window.confirm(`${targetRoleProfile.label} 역할을 삭제하시겠습니까? 사용 중인 역할은 삭제되지 않습니다.`);
    if (!confirmed) {
      return;
    }

    setRoleProfileProcessingKey(roleProfileKey);
    setFlash(null);
    try {
      await api.delete(`/admin/users/role-profiles/${roleProfileKey}`);
      const nextOptions = await loadPermissionOptions(true);
      if (nextOptions && form.roleProfileKey === roleProfileKey) {
        setForm((current) => ({
          ...current,
          role: 'USER',
          roleProfileKey: 'USER',
          permissionPreset: getDefaultPresetKeyForRole('USER'),
        }));
      }
      setFlash({
        kind: 'success',
        title: '권한 역할을 삭제했습니다.',
      });
    } catch (error) {
      setFlash({
        kind: 'error',
        title: '권한 역할을 삭제하지 못했습니다.',
        description: getErrorMessage(error),
      });
    } finally {
      setRoleProfileProcessingKey(null);
    }
  };

  return (
    <div className="admin-page pb-6">
      <section className="admin-header">
        <div className="admin-header-row">
          <div>
            <h2 className="admin-page-title">사용자 관리</h2>
            <p className="admin-page-description">계정 생성, 권한 변경, 초기 비밀번호 재설정</p>
          </div>
          <button type="button" onClick={() => void loadUsers()} className="admin-btn">
            <RefreshCw size={16} />
            새로고침
          </button>
        </div>
      </section>

      {flash && (
        <section
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            flash.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{flash.title}</p>
              {flash.description && <p className="mt-1 text-sm">{flash.description}</p>}
            </div>
            {flash.kind === 'success' && <BadgeCheck size={18} className="shrink-0" />}
          </div>

          {flash.credentials && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/70 bg-white px-3 py-3 text-slate-700">
              <span className="text-sm font-medium">{flash.credentials.email}</span>
              <span className="text-sm font-medium">/ {flash.credentials.temporaryPassword}</span>
              <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                <button
                  type="button"
                  onClick={() => void copyText(flash.credentials!.email, 'email')}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
                >
                  {copiedField === 'email' ? <CheckCheck size={14} /> : <Copy size={14} />}
                  {copiedField === 'email' ? '이메일 복사 완료' : '이메일 복사'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(`이메일: ${flash.credentials!.email}\n초기 비밀번호: ${flash.credentials!.temporaryPassword}`, 'credentials')}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
                >
                  {copiedField === 'credentials' ? <CheckCheck size={14} /> : <Copy size={14} />}
                  {copiedField === 'credentials' ? '로그인 정보 복사 완료' : '로그인 정보 복사'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <form onSubmit={handleCreateUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_minmax(0,1fr)_200px_140px]">
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-slate-700">이름</label>
            <input
              type="text"
              value={form.name ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="선택 입력"
              autoComplete="name"
            />
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-slate-700">이메일</label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-200">
              <UserPlus size={16} className="shrink-0 text-slate-400" />
              <input
                ref={emailInputRef}
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full bg-transparent text-sm text-slate-700 outline-none"
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-slate-700">권한 역할</label>
            <select
              value={form.roleProfileKey ?? 'USER'}
              onChange={(event) => {
                const roleProfileKey = event.target.value;
                const selectedRoleProfile = getRoleProfile(roleProfileKey);
                const nextRole = (selectedRoleProfile?.baseRole ?? 'USER') as Exclude<Role, 'SUPER_ADMIN'>;
                setForm((current) => ({
                  ...current,
                  role: nextRole,
                  roleProfileKey,
                  permissionPreset: current.permissionPreset ?? getDefaultPresetKeyForRole(nextRole),
                }));
              }}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              {getRoleProfiles().map((profile) => (
                <option key={profile.key} value={profile.key}>
                  {profile.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="animate-spin" size={17} /> : <Shield size={17} />}
              계정 발급
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-2.5 py-1">첫 로그인 시 비밀번호 변경 필요</span>
            <span className="rounded-full bg-white px-2.5 py-1">첫 로그인 후 비밀번호 변경</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedSetup((current) => !current)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Settings2 size={14} />
            {showAdvancedSetup ? '고급 권한 숨기기' : '고급 권한 열기'}
          </button>
        </div>

        {showAdvancedSetup && (
          <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_200px_180px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">발급 기본 프리셋</label>
              <select
                value={form.permissionPreset ?? 'VIEWER'}
                onChange={(event) => setForm((current) => ({ ...current, permissionPreset: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                {(permissionOptions?.presets ?? []).map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setRoleProfileModalOpen(true)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={14} />
                권한 역할 관리
              </button>
            </div>
            <div className="flex items-end text-xs text-slate-500">
              페이지 조합은 사용자별 `페이지 권한` 버튼에서 저장합니다.
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">사용자 목록</h3>
            <p className="mt-1 text-sm text-slate-500">총 {users.length}개 계정</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-slate-700">아직 등록된 사용자가 없습니다.</p>
            <p className="mt-1 text-sm text-slate-500">위에서 첫 계정을 발급하세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => {
              const locked = user.role === 'SUPER_ADMIN' || user.email === currentUserEmail;
              const status = getUserStatus(user);

              return (
                <article key={user.id} className="px-4 py-4 md:px-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{user.name?.trim() || '이름 없음'}</p>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {user.roleLabel ?? ROLE_LABELS[user.role]}
                        </span>
                        {user.email === currentUserEmail && (
                          <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                            현재 로그인
                          </span>
                        )}
                      </div>
                      <p className="mt-2 break-all text-sm text-slate-500">{user.email}</p>
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <p className="font-semibold text-slate-700">권한 프리셋</p>
                          <p className="mt-1">{resolvePresetLabel(user.permissionPreset)}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <p className="font-semibold text-slate-700">허용 페이지</p>
                          <p className="mt-1">{user.pagePermissions.length}개 페이지</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <p className="font-semibold text-slate-700">생성일</p>
                          <p className="mt-1">{formatDateTime(user.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 xl:self-start">
                      <button
                        type="button"
                        onClick={() => setManagingUserId(user.id)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Settings2 size={14} />
                        관리
                      </button>
                      {locked && (
                        <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-400">
                          관리 고정
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {managingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 md:flex md:items-center md:justify-center">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:h-auto md:max-h-[92vh]">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 md:px-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">사용자 관리</h3>
                <p className="mt-1 break-all text-sm text-slate-500">{managingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setManagingUserId(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-5">
              <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-xs font-semibold text-slate-600">이름</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={nameDrafts[managingUser.id] ?? ''}
                      onChange={(event) => setNameDrafts((current) => ({ ...current, [managingUser.id]: event.target.value }))}
                      disabled={processingUserId === managingUser.id}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                      placeholder="이름 입력"
                    />
                    <button
                      type="button"
                      onClick={() => void handleNameSave(managingUser)}
                      disabled={processingUserId === managingUser.id}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      저장
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-600">상태</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getUserStatus(managingUser).className}`}>
                      {getUserStatus(managingUser).label}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {managingUser.roleLabel ?? ROLE_LABELS[managingUser.role]}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">생성일 {formatDateTime(managingUser.createdAt)}</p>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-xs font-semibold text-slate-600">권한 역할</label>
                  {managingUser.role === 'SUPER_ADMIN' ? (
                    <div className="inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white">
                      {managingUser.roleLabel ?? ROLE_LABELS[managingUser.role]}
                    </div>
                  ) : (
                    <select
                      value={managingUser.roleProfileKey ?? managingUser.role}
                      onChange={(event) => void handleRoleChange(managingUser, event.target.value)}
                      disabled={processingUserId === managingUser.id}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {getRoleProfiles().map((profile) => (
                        <option key={profile.key} value={profile.key}>
                          {profile.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-600">페이지 권한</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{resolvePresetLabel(managingUser.permissionPreset)}</p>
                  <p className="mt-1 text-xs text-slate-500">{managingUser.pagePermissions.length}개 페이지 허용</p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => openPermissionModal(managingUser)}
                      disabled={processingUserId === managingUser.id}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Settings2 size={14} />
                      페이지 권한 설정
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                {managingUser.role === 'SUPER_ADMIN' || managingUser.email === currentUserEmail ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    이 계정은 현재 로그인 계정이거나 슈퍼 어드민이어서 비밀번호 초기화와 삭제가 제한됩니다.
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleResetPassword(managingUser)}
                      disabled={processingUserId === managingUser.id}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingUserId === managingUser.id ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />}
                      초기 비밀번호 재설정
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteUser(managingUser)}
                      disabled={processingUserId === managingUser.id}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={15} />
                      사용자 삭제
                    </button>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {roleProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 md:flex md:items-center md:justify-center">
          <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:h-auto md:max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 md:px-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">권한 역할 관리</h3>
                <p className="mt-1 text-sm text-slate-500">원하는 이름의 역할을 만들고 기준 권한을 연결할 수 있습니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setRoleProfileModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-5">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">역할 이름</label>
                    <input
                      type="text"
                      value={roleProfileForm.label}
                      onChange={(event) => setRoleProfileForm((current) => ({ ...current, label: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                      placeholder="예: 현장 출고 담당"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">기준 권한</label>
                    <select
                      value={roleProfileForm.baseRole}
                      onChange={(event) => setRoleProfileForm((current) => ({ ...current, baseRole: event.target.value as Exclude<Role, 'SUPER_ADMIN'> }))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-2 block text-xs font-semibold text-slate-600">설명</label>
                  <input
                    type="text"
                    value={roleProfileForm.description ?? ''}
                    onChange={(event) => setRoleProfileForm((current) => ({ ...current, description: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    placeholder="어떤 사용자에게 쓰는 역할인지"
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleCreateRoleProfile()}
                    disabled={roleProfileSubmitting}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {roleProfileSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    역할 저장
                  </button>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">역할 목록</p>
                    <p className="mt-1 text-xs text-slate-500">기본 역할은 삭제할 수 없고, 사용자 정의 역할만 삭제할 수 있습니다.</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(permissionOptions?.roleProfiles ?? []).map((profile) => (
                    <div key={profile.key} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{profile.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{profile.description || '설명 없음'}</p>
                        </div>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {ROLE_LABELS[profile.baseRole]}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        {profile.systemProfile ? (
                          <span className="text-xs font-medium text-slate-400">기본 역할</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleDeleteRoleProfile(profile.key)}
                            disabled={roleProfileProcessingKey === profile.key}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {roleProfileProcessingKey === profile.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {permissionModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/30 md:flex md:items-center md:justify-center md:p-4">
          <div className="flex h-full w-full flex-col bg-white md:h-auto md:max-h-[92vh] md:max-w-3xl md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 md:px-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">페이지 권한 설정</h3>
                <p className="mt-1 text-sm text-slate-500">{permissionModalUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setPermissionModalUser(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-5">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">프리셋</p>
                    <p className="mt-1 text-xs text-slate-500">기본 프리셋을 고르거나 현재 선택을 새 프리셋으로 저장할 수 있습니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPresetFormOpen((current) => !current)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus size={14} />
                    새 프리셋 저장
                  </button>
                </div>

                {presetFormOpen && (
                  <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">프리셋 이름</label>
                      <input
                        type="text"
                        value={presetForm.label}
                        onChange={(event) => setPresetForm((current) => ({ ...current, label: event.target.value }))}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                        placeholder="예: 현장 조회 + 출고"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">설명</label>
                      <input
                        type="text"
                        value={presetForm.description}
                        onChange={(event) => setPresetForm((current) => ({ ...current, description: event.target.value }))}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                        placeholder="어떤 사용자에게 쓰는지"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => void handleCreatePermissionPreset()}
                        disabled={presetSubmitting}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {presetSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                        저장
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {(permissionOptions?.presets ?? []).map((preset) => {
                    const active = permissionPresetDraft === preset.key;
                    return (
                      <div
                        key={preset.key}
                        className={`rounded-xl border px-4 py-4 text-left transition ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => applyPresetDraft(preset.key)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{preset.label}</p>
                              {!preset.systemPreset && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  사용자 추가
                                </span>
                              )}
                            </div>
                            <p className={`mt-1 text-xs leading-5 ${active ? 'text-white/80' : 'text-slate-500'}`}>
                              {preset.description}
                            </p>
                          </button>
                          {!preset.systemPreset && (
                            <button
                              type="button"
                              onClick={() => void handleDeletePermissionPreset(preset.key)}
                              disabled={presetProcessingKey === preset.key}
                              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                                active
                                  ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                                  : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                              aria-label={`${preset.label} 프리셋 삭제`}
                            >
                              {presetProcessingKey === preset.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">페이지별 권한</p>
                    <p className="mt-1 text-xs text-slate-500">체크한 페이지에만 접근할 수 있습니다.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {permissionDrafts.length}개 선택
                  </span>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(permissionOptions?.pages ?? []).map((page) => {
                    const checked = permissionDrafts.includes(page.key);
                    return (
                      <label
                        key={page.key}
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                          checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermissionDraft(page.key)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{page.label}</p>
                          <p className="truncate text-xs text-slate-500">{page.path}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-4 md:px-5">
              <button
                type="button"
                onClick={() => setPermissionModalUser(null)}
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleSavePermissions()}
                disabled={processingUserId === permissionModalUser.id}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processingUserId === permissionModalUser.id ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccounts;
