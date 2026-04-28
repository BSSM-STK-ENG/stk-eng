import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import type { FlashMessage } from '../components/admin/FlashBanner';
import { FlashBanner } from '../components/admin/FlashBanner';
import { PermissionPresetsPanel } from '../components/admin/PermissionPresetsPanel';
import { RoleProfilesPanel } from '../components/admin/RoleProfilesPanel';
import { UserCreateForm } from '../components/admin/UserCreateForm';
import { UserListTable } from '../components/admin/UserListTable';
import { UserManageDrawer } from '../components/admin/UserManageDrawer';
import type {
  AdminCreatedUserResponse,
  AdminCreatePermissionPresetRequest,
  AdminCreateRoleProfileRequest,
  AdminCreateUserRequest,
  AdminPasswordResetResponse,
  AdminPermissionOptionsResponse,
  AdminUpdateUserNameRequest,
  AdminUpdateUserPermissionsRequest,
  AdminUserSummary,
  PagePermissionKey,
  Role,
} from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { getStoredEmail } from '../utils/auth-session';

const AdminAccounts = () => {
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const currentUserEmail = getStoredEmail();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMessage | null>(null);
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

  const setErrorFlash = useCallback(
    (title: string, error: unknown) => setFlash({ kind: 'error', title, description: getErrorMessage(error) }),
    [],
  );

  const getDefaultPresetKeyForRole = useCallback(
    (role: AdminUserSummary['role'] | AdminCreateUserRequest['role']) => (role === 'ADMIN' ? 'OPERATOR' : 'VIEWER'),
    [],
  );

  const getRoleProfiles = useCallback(
    () => (permissionOptions?.roleProfiles ?? []).filter((profile) => profile.baseRole !== 'SUPER_ADMIN'),
    [permissionOptions?.roleProfiles],
  );

  const getRoleProfile = useCallback(
    (roleProfileKey: string | null | undefined) => getRoleProfiles().find((profile) => profile.key === roleProfileKey),
    [getRoleProfiles],
  );

  const managingUser = managingUserId ? (users.find((user) => user.id === managingUserId) ?? null) : null;

  const resolvePresetLabel = useCallback(
    (presetKey: string | null) =>
      permissionOptions?.presets.find((item) => item.key === presetKey)?.label ?? presetKey ?? '권한 미설정',
    [permissionOptions?.presets],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<AdminUserSummary[]>('/admin/users');
      setUsers(response.data);
      setNameDrafts(Object.fromEntries(response.data.map((user) => [user.id, user.name ?? ''])));
    } catch (error) {
      setErrorFlash('사용자 목록을 불러오지 못했습니다.', error);
    } finally {
      setLoading(false);
    }
  }, [setErrorFlash]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const loadPermissionOptions = useCallback(
    async (silent = false) => {
      try {
        const response = await api.get<AdminPermissionOptionsResponse>('/admin/users/permission-options');
        setPermissionOptions(response.data);
        setForm((current) => {
          const roleProfiles = response.data.roleProfiles ?? [];
          const resolvedRoleProfileKey =
            current.roleProfileKey ?? roleProfiles.find((profile) => profile.key === current.role)?.key ?? 'USER';
          const selectedRoleProfile = roleProfiles.find((profile) => profile.key === resolvedRoleProfileKey);
          return {
            ...current,
            roleProfileKey: resolvedRoleProfileKey,
            permissionPreset:
              current.permissionPreset ?? getDefaultPresetKeyForRole(selectedRoleProfile?.baseRole ?? current.role),
          };
        });
        return response.data;
      } catch (error) {
        if (!silent) setErrorFlash('권한 프리셋을 불러오지 못했습니다.', error);
        return null;
      }
    },
    [getDefaultPresetKeyForRole, setErrorFlash],
  );

  useEffect(() => {
    void loadPermissionOptions();
  }, [loadPermissionOptions]);

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
        credentials: { email: response.data.email, temporaryPassword: response.data.temporaryPassword },
      });
      await loadUsers();
      window.setTimeout(() => emailInputRef.current?.focus(), 0);
    } catch (error) {
      setErrorFlash('계정을 발급하지 못했습니다.', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (user: AdminUserSummary, roleProfileKey: string) => {
    if ((user.roleProfileKey ?? user.role) === roleProfileKey) return;
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
        description: `${user.email} 계정은 이제 ${response.data.roleLabel ?? response.data.role} 권한을 사용합니다.`,
      });
    } catch (error) {
      setErrorFlash('권한을 변경하지 못했습니다.', error);
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleNameSave = async (user: AdminUserSummary) => {
    const name = (nameDrafts[user.id] ?? '').trim();
    if (!name) {
      setFlash({ kind: 'error', title: '이름을 입력해주세요.' });
      return;
    }
    if (name === (user.name ?? '')) return;
    setProcessingUserId(user.id);
    setFlash(null);
    try {
      const response = await api.put<AdminUserSummary, { data: AdminUserSummary }, AdminUpdateUserNameRequest>(
        `/admin/users/${user.id}/name`,
        { name },
      );
      setUsers((current) => current.map((item) => (item.id === user.id ? response.data : item)));
      setNameDrafts((current) => ({ ...current, [user.id]: response.data.name ?? '' }));
      setFlash({
        kind: 'success',
        title: '사용자 이름을 변경했습니다.',
        description: `${response.data.email} 계정의 이름을 ${response.data.name}으로 저장했습니다.`,
      });
    } catch (error) {
      setErrorFlash('사용자 이름을 변경하지 못했습니다.', error);
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
        current.map((item) =>
          item.id === user.id ? { ...item, passwordChangeRequired: response.data.passwordChangeRequired } : item,
        ),
      );
      setFlash({
        kind: 'success',
        title: '초기 비밀번호로 재설정했습니다.',
        description: '다음 로그인 시 새 비밀번호 설정이 다시 필요합니다.',
        credentials: { email: response.data.email, temporaryPassword: response.data.temporaryPassword },
      });
    } catch (error) {
      setErrorFlash('비밀번호를 재설정하지 못했습니다.', error);
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserSummary) => {
    const confirmed = window.confirm(
      `${user.email} 계정을 삭제하시겠습니까?\n이미 거래나 마감 이력에 사용된 계정은 삭제되지 않습니다.`,
    );
    if (!confirmed) return;
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
      if (managingUserId === user.id) setManagingUserId(null);
    } catch (error) {
      setErrorFlash('사용자 계정을 삭제하지 못했습니다.', error);
    } finally {
      setProcessingUserId(null);
    }
  };

  const applyPresetDraft = (presetKey: string, options = permissionOptions) => {
    setPermissionPresetDraft(presetKey);
    const preset = options?.presets.find((item) => item.key === presetKey);
    if (preset) setPermissionDrafts(preset.pagePermissions);
  };

  const openPermissionModal = (user: AdminUserSummary) => {
    setPermissionModalUser(user);
    setPermissionPresetDraft(user.permissionPreset ?? 'VIEWER');
    setPermissionDrafts(user.pagePermissions ?? []);
    setPresetFormOpen(false);
    setPresetForm({ label: '', description: '' });
    setFlash(null);
  };

  const togglePermissionDraft = (permission: PagePermissionKey) =>
    setPermissionDrafts((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );

  const handleSavePermissions = async () => {
    if (!permissionModalUser) return;
    setProcessingUserId(permissionModalUser.id);
    setFlash(null);
    try {
      const response = await api.put<AdminUserSummary, { data: AdminUserSummary }, AdminUpdateUserPermissionsRequest>(
        `/admin/users/${permissionModalUser.id}/permissions`,
        { permissionPreset: permissionPresetDraft, pagePermissions: permissionDrafts },
      );
      setUsers((current) => current.map((item) => (item.id === response.data.id ? response.data : item)));
      setPermissionModalUser(null);
      setFlash({
        kind: 'success',
        title: '페이지 권한을 저장했습니다.',
        description: `${response.data.email} 계정의 접근 페이지를 업데이트했습니다.`,
      });
    } catch (error) {
      setErrorFlash('페이지 권한을 저장하지 못했습니다.', error);
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleCreatePermissionPreset = async () => {
    if (permissionDrafts.length === 0) {
      setFlash({ kind: 'error', title: '프리셋에 포함할 페이지를 하나 이상 선택해주세요.' });
      return;
    }
    setPresetSubmitting(true);
    setFlash(null);
    try {
      const response = await api.post<
        AdminPermissionOptionsResponse['presets'][number],
        { data: AdminPermissionOptionsResponse['presets'][number] },
        AdminCreatePermissionPresetRequest
      >('/admin/users/permission-presets', {
        label: presetForm.label,
        description: presetForm.description.trim() || undefined,
        pagePermissions: permissionDrafts,
      });
      const nextOptions = await loadPermissionOptions(true);
      if (nextOptions) applyPresetDraft(response.data.key, nextOptions);
      setPresetFormOpen(false);
      setPresetForm({ label: '', description: '' });
      setFlash({
        kind: 'success',
        title: '새 권한 프리셋을 저장했습니다.',
        description: `${response.data.label} 프리셋을 바로 사용할 수 있습니다.`,
      });
    } catch (error) {
      setErrorFlash('권한 프리셋을 저장하지 못했습니다.', error);
    } finally {
      setPresetSubmitting(false);
    }
  };

  const handleDeletePermissionPreset = async (presetKey: string) => {
    const targetPreset = permissionOptions?.presets.find((preset) => preset.key === presetKey);
    if (!targetPreset || targetPreset.systemPreset) return;
    const confirmed = window.confirm(
      `${targetPreset.label} 프리셋을 삭제하시겠습니까? 사용 중인 프리셋은 삭제되지 않습니다.`,
    );
    if (!confirmed) return;
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
      setFlash({ kind: 'success', title: '권한 프리셋을 삭제했습니다.' });
    } catch (error) {
      setErrorFlash('권한 프리셋을 삭제하지 못했습니다.', error);
    } finally {
      setPresetProcessingKey(null);
    }
  };

  const handleCreateRoleProfile = async () => {
    setRoleProfileSubmitting(true);
    setFlash(null);
    try {
      const response = await api.post<
        AdminPermissionOptionsResponse['roleProfiles'][number],
        { data: AdminPermissionOptionsResponse['roleProfiles'][number] },
        AdminCreateRoleProfileRequest
      >('/admin/users/role-profiles', roleProfileForm);
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
      setErrorFlash('권한 역할을 저장하지 못했습니다.', error);
    } finally {
      setRoleProfileSubmitting(false);
    }
  };

  const handleDeleteRoleProfile = async (roleProfileKey: string) => {
    const targetRoleProfile = permissionOptions?.roleProfiles.find((profile) => profile.key === roleProfileKey);
    if (!targetRoleProfile || targetRoleProfile.systemProfile) return;
    const confirmed = window.confirm(
      `${targetRoleProfile.label} 역할을 삭제하시겠습니까? 사용 중인 역할은 삭제되지 않습니다.`,
    );
    if (!confirmed) return;
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
      setFlash({ kind: 'success', title: '권한 역할을 삭제했습니다.' });
    } catch (error) {
      setErrorFlash('권한 역할을 삭제하지 못했습니다.', error);
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
        <FlashBanner
          flash={flash}
          onClipboardError={(description) =>
            setFlash({ kind: 'error', title: '클립보드 복사에 실패했습니다.', description })
          }
        />
      )}

      <UserCreateForm
        form={form}
        submitting={submitting}
        showAdvancedSetup={showAdvancedSetup}
        permissionOptions={permissionOptions}
        onFormChange={setForm}
        onSubmit={(event) => void handleCreateUser(event)}
        onToggleAdvancedSetup={() => setShowAdvancedSetup((current) => !current)}
        onOpenRoleProfileModal={() => setRoleProfileModalOpen(true)}
        getRoleProfiles={getRoleProfiles}
        getDefaultPresetKeyForRole={getDefaultPresetKeyForRole}
        getRoleProfile={getRoleProfile}
        emailInputRef={emailInputRef}
      />

      <UserListTable
        users={users}
        loading={loading}
        currentUserEmail={currentUserEmail}
        permissionOptions={permissionOptions}
        onManage={setManagingUserId}
      />

      {managingUser && (
        <UserManageDrawer
          managingUser={managingUser}
          currentUserEmail={currentUserEmail}
          processingUserId={processingUserId}
          nameDrafts={nameDrafts}
          permissionOptions={permissionOptions}
          onClose={() => setManagingUserId(null)}
          onNameDraftChange={(userId, value) => setNameDrafts((current) => ({ ...current, [userId]: value }))}
          onNameSave={(user) => void handleNameSave(user)}
          onRoleChange={(user, roleProfileKey) => void handleRoleChange(user, roleProfileKey)}
          onOpenPermissionModal={openPermissionModal}
          onResetPassword={(user) => void handleResetPassword(user)}
          onDeleteUser={(user) => void handleDeleteUser(user)}
          getRoleProfiles={getRoleProfiles}
          resolvePresetLabel={resolvePresetLabel}
        />
      )}

      {roleProfileModalOpen && (
        <RoleProfilesPanel
          permissionOptions={permissionOptions}
          roleProfileForm={roleProfileForm}
          roleProfileSubmitting={roleProfileSubmitting}
          roleProfileProcessingKey={roleProfileProcessingKey}
          onClose={() => setRoleProfileModalOpen(false)}
          onRoleProfileFormChange={setRoleProfileForm}
          onCreateRoleProfile={() => void handleCreateRoleProfile()}
          onDeleteRoleProfile={(key) => void handleDeleteRoleProfile(key)}
        />
      )}

      {permissionModalUser && (
        <PermissionPresetsPanel
          permissionModalUser={permissionModalUser}
          permissionOptions={permissionOptions}
          permissionPresetDraft={permissionPresetDraft}
          permissionDrafts={permissionDrafts}
          presetFormOpen={presetFormOpen}
          presetSubmitting={presetSubmitting}
          presetProcessingKey={presetProcessingKey}
          processingUserId={processingUserId}
          presetForm={presetForm}
          onClose={() => setPermissionModalUser(null)}
          onPresetFormChange={setPresetForm}
          onTogglePresetForm={() => setPresetFormOpen((current) => !current)}
          onApplyPresetDraft={(key) => applyPresetDraft(key)}
          onTogglePermissionDraft={togglePermissionDraft}
          onCreatePermissionPreset={() => void handleCreatePermissionPreset()}
          onDeletePermissionPreset={(key) => void handleDeletePermissionPreset(key)}
          onSavePermissions={() => void handleSavePermissions()}
        />
      )}
    </div>
  );
};

export default AdminAccounts;
