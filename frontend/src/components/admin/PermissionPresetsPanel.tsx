'use client';

import { Loader2, Plus, Settings2, Trash2, X } from 'lucide-react';
import type { AdminPermissionOptionsResponse, AdminUserSummary, PagePermissionKey } from '../../types/api';

interface PermissionPresetsPanelProps {
  permissionModalUser: AdminUserSummary;
  permissionOptions: AdminPermissionOptionsResponse | null;
  permissionPresetDraft: string;
  permissionDrafts: PagePermissionKey[];
  presetFormOpen: boolean;
  presetSubmitting: boolean;
  presetProcessingKey: string | null;
  processingUserId: string | null;
  presetForm: { label: string; description: string };
  onClose: () => void;
  onPresetFormChange: (form: { label: string; description: string }) => void;
  onTogglePresetForm: () => void;
  onApplyPresetDraft: (presetKey: string) => void;
  onTogglePermissionDraft: (permission: PagePermissionKey) => void;
  onCreatePermissionPreset: () => void;
  onDeletePermissionPreset: (presetKey: string) => void;
  onSavePermissions: () => void;
}

export function PermissionPresetsPanel({
  permissionModalUser,
  permissionOptions,
  permissionPresetDraft,
  permissionDrafts,
  presetFormOpen,
  presetSubmitting,
  presetProcessingKey,
  processingUserId,
  presetForm,
  onClose,
  onPresetFormChange,
  onTogglePresetForm,
  onApplyPresetDraft,
  onTogglePermissionDraft,
  onCreatePermissionPreset,
  onDeletePermissionPreset,
  onSavePermissions,
}: PermissionPresetsPanelProps) {
  const isProcessing = processingUserId === permissionModalUser.id;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/30 md:flex md:items-center md:justify-center md:p-4">
      <div className="flex h-full w-full flex-col bg-white md:h-auto md:max-h-[92vh] md:max-w-3xl md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 md:px-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">페이지 권한 설정</h3>
            <p className="mt-1 text-sm text-slate-500">{permissionModalUser.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                <p className="mt-1 text-xs text-slate-500">
                  기본 프리셋을 고르거나 현재 선택을 새 프리셋으로 저장할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onTogglePresetForm}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={14} />새 프리셋 저장
              </button>
            </div>

            {presetFormOpen && (
              <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                <div>
                  <label htmlFor="permission-preset-label" className="mb-2 block text-xs font-semibold text-slate-600">
                    프리셋 이름
                  </label>
                  <input
                    id="permission-preset-label"
                    type="text"
                    value={presetForm.label}
                    onChange={(event) => onPresetFormChange({ ...presetForm, label: event.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="예: 현장 조회 + 출고"
                  />
                </div>
                <div>
                  <label
                    htmlFor="permission-preset-description"
                    className="mb-2 block text-xs font-semibold text-slate-600"
                  >
                    설명
                  </label>
                  <input
                    id="permission-preset-description"
                    type="text"
                    value={presetForm.description}
                    onChange={(event) => onPresetFormChange({ ...presetForm, description: event.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="어떤 사용자에게 쓰는지"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={onCreatePermissionPreset}
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
                        onClick={() => onApplyPresetDraft(preset.key)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{preset.label}</p>
                          {!preset.systemPreset && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}
                            >
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
                          onClick={() => onDeletePermissionPreset(preset.key)}
                          disabled={presetProcessingKey === preset.key}
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                            active
                              ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                              : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                          aria-label={`${preset.label} 프리셋 삭제`}
                        >
                          {presetProcessingKey === preset.key ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
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
                      onChange={() => onTogglePermissionDraft(page.key)}
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
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSavePermissions}
            disabled={isProcessing}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
