import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Sparkles, X } from 'lucide-react';
import type { MaterialDto } from '../../types/api';
import {
  clearMaterialWorklist,
  getMaterialWorklistCodes,
  subscribeMaterialWorklist,
  toggleMaterialWorklistCode,
} from '../../utils/material-worklist';

type Accent = 'blue' | 'rose' | 'slate';

interface MaterialWorklistPanelAction {
  label: string;
  onClick: () => void;
  tone?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}

interface MaterialWorklistPanelStep {
  title: string;
  description: string;
}

interface MaterialWorklistPanelProps {
  materials: MaterialDto[];
  title: string;
  description: string;
  accent?: Accent;
  badgeLabel?: string;
  itemLabel?: string;
  activeMaterialCode?: string | null;
  onPickMaterial?: (material: MaterialDto) => void;
  actions?: MaterialWorklistPanelAction[];
  emptyActions?: MaterialWorklistPanelAction[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptySteps?: MaterialWorklistPanelStep[];
  selectionHint?: string;
  compact?: boolean;
}

function getAccentClasses(accent: Accent) {
  switch (accent) {
    case 'rose':
      return {
        shell: 'border-rose-100 bg-[linear-gradient(145deg,rgba(255,255,255,0.96)_0%,rgba(255,243,245,0.98)_100%)]',
        badge: 'border-rose-100 bg-rose-50 text-rose-700',
        primaryAction: 'bg-rose-500 text-white hover:bg-rose-600',
        primaryChip: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
        activeChip: 'border-rose-200 bg-rose-500 text-white',
        helper: 'bg-rose-50 text-rose-700',
      };
    case 'slate':
      return {
        shell: 'border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_100%)]',
        badge: 'border-slate-200 bg-slate-100 text-slate-700',
        primaryAction: 'bg-slate-900 text-white hover:bg-slate-800',
        primaryChip: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
        activeChip: 'border-slate-300 bg-slate-900 text-white',
        helper: 'bg-slate-100 text-slate-700',
      };
    case 'blue':
    default:
      return {
        shell: 'border-blue-100 bg-[linear-gradient(145deg,rgba(255,255,255,0.96)_0%,rgba(240,247,255,0.98)_100%)]',
        badge: 'border-blue-100 bg-blue-50 text-blue-700',
        primaryAction: 'bg-blue-600 text-white hover:bg-blue-700',
        primaryChip: 'border-blue-100 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50',
        activeChip: 'border-blue-200 bg-blue-600 text-white',
        helper: 'bg-blue-50 text-blue-700',
      };
  }
}

const MaterialWorklistPanel: React.FC<MaterialWorklistPanelProps> = ({
  materials,
  title,
  description,
  accent = 'blue',
  badgeLabel = '오늘 처리 목록',
  itemLabel = '자재',
  activeMaterialCode = null,
  onPickMaterial,
  actions = [],
  emptyActions = [],
  emptyTitle = '작업 바구니가 비어 있습니다.',
  emptyDescription = '현재 재고나 트렌드에서 자재를 담아두면 여러 화면에서 다시 찾지 않아도 됩니다.',
  emptySteps = [],
  selectionHint,
  compact = false,
}) => {
  const [worklistCodes, setWorklistCodes] = useState<string[]>(() => getMaterialWorklistCodes());
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const palette = getAccentClasses(accent);

  useEffect(() => subscribeMaterialWorklist(setWorklistCodes), []);

  const resolvedItems = useMemo(
    () => worklistCodes.map((code) => ({
      code,
      material: materials.find((material) => material.materialCode === code) ?? null,
    })),
    [materials, worklistCodes],
  );

  const renderActionButton = (action: MaterialWorklistPanelAction) => {
    const tone = action.tone ?? 'secondary';
    const className = tone === 'primary'
      ? palette.primaryAction
      : tone === 'ghost'
        ? 'border border-transparent bg-transparent text-slate-500 hover:bg-white/70 hover:text-slate-900'
        : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900';

    return (
      <button
        key={action.label}
        type="button"
        onClick={action.onClick}
        disabled={action.disabled}
        className={`chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${className} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {action.label}
        {tone === 'primary' && <ArrowRight size={15} />}
      </button>
    );
  };

  const countLabel = resolvedItems.length > 0
    ? `${itemLabel} ${resolvedItems.length}개`
    : `${itemLabel} 없음`;

  return (
    <section className={`overflow-hidden rounded-[28px] border p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] ${palette.shell} ${compact ? 'sm:p-4' : 'sm:p-5'}`}>
      <div className={`flex flex-col gap-4 ${compact ? 'lg:flex-row lg:items-start lg:justify-between' : 'xl:flex-row xl:items-start xl:justify-between'}`}>
        <div className={compact ? 'max-w-2xl' : 'max-w-3xl'}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${palette.badge}`}>
            <Sparkles size={13} />
            {badgeLabel}
          </div>
          <h3 className={`mt-3 font-black tracking-tight text-slate-900 ${compact ? 'text-base md:text-lg' : 'text-xl md:text-2xl'}`}>{title}</h3>
          <p className={`mt-1.5 max-w-2xl text-slate-600 ${compact ? 'text-sm leading-6' : 'text-sm leading-7 md:text-[15px]'}`}>{description}</p>
          {resolvedItems.length > 0 && selectionHint && (
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${palette.helper}`}>
              <Check size={12} />
              {selectionHint}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${palette.helper}`}>
            {resolvedItems.length > 0 ? `담아둔 ${countLabel}` : `선택한 ${countLabel}`}
          </span>
          {resolvedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setWorklistCodes(clearMaterialWorklist())}
              className="chat-focus-ring min-h-10 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              전체 비우기
            </button>
          )}
        </div>
      </div>

      {resolvedItems.length > 0 ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {resolvedItems.map(({ code, material }) => {
              const isActive = activeMaterialCode === code;
              const canPick = Boolean(material && onPickMaterial);

              return (
                <div
                  key={code}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 transition ${isActive ? palette.activeChip : palette.primaryChip}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (material && onPickMaterial) {
                        onPickMaterial(material);
                      }
                    }}
                    disabled={!canPick}
                    className={`chat-focus-ring inline-flex items-center gap-2 text-left text-xs font-semibold ${canPick ? '' : 'cursor-default'} ${isActive ? 'text-white' : ''} disabled:opacity-100`}
                  >
                    {isActive && <Check size={12} className="shrink-0" />}
                    <span className="max-w-[220px] truncate">
                      {material?.materialName ?? code}
                    </span>
                    <span className={`text-[11px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {code}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorklistCodes(toggleMaterialWorklistCode(code))}
                    className={`chat-focus-ring flex h-7 w-7 items-center justify-center rounded-full transition ${isActive ? 'bg-white/16 text-white hover:bg-white/24' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                    aria-label={`${code} 작업 바구니에서 제거`}
                    title="작업 바구니에서 제거"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {actions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map(renderActionButton)}
            </div>
          )}
        </>
      ) : (
        <div className={`mt-4 rounded-[22px] border border-dashed border-slate-200 bg-white/78 ${compact ? 'px-4 py-4' : 'px-4 py-4 sm:px-5'}`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-base font-black text-slate-800">{emptyTitle}</p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">{emptyDescription}</p>
                {emptySteps.length > 0 && (
                  <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                    {compact ? '필요하면 아래에서 사용법을 펼쳐 보세요.' : `사용법은 ${emptySteps.length}단계로 끝납니다.`}
                  </div>
                )}
              </div>
              {(emptyActions.length > 0 || emptySteps.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {emptyActions.map(renderActionButton)}
                  {emptySteps.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowGuide((current) => !current)}
                      className="chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      {showGuide ? '사용법 접기' : '사용법 보기'}
                      <ChevronDown size={15} className={`transition-transform ${showGuide ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {emptySteps.length > 0 && showGuide && (
              <div className={`grid gap-3 ${compact ? 'sm:grid-cols-1' : 'md:grid-cols-3'}`}>
                {emptySteps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${
                      compact ? 'px-4 py-3.5' : 'px-4 py-4'
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${palette.badge}`}>
                      {index + 1}
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-800">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{step.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default MaterialWorklistPanel;
