import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, MapPin, Plus, Search, Star } from 'lucide-react';
import type { MaterialDto } from '../../types/api';
import { formatLocation, sanitizeLocation } from '../../utils/inventory-display';
import {
  getFavoriteMaterialCodes,
  getRecentMaterialCodes,
  subscribeMaterialPreferences,
  toggleFavoriteMaterialCode,
} from '../../utils/material-preferences';
import {
  getMaterialWorklistCodes,
  subscribeMaterialWorklist,
  toggleMaterialWorklistCode,
} from '../../utils/material-worklist';

type Accent = 'blue' | 'rose';

type MaterialLookupFieldProps = {
  materials: MaterialDto[];
  inputValue: string;
  selectedCode: string;
  accent?: Accent;
  placeholder?: string;
  onInputValueChange: (value: string) => void;
  onSelectionChange: (material: MaterialDto | null) => void;
};

const ACCENT_STYLES: Record<Accent, { ring: string; border: string; badge: string; check: string }> = {
  blue: {
    ring: 'focus:ring-blue-500/30 focus:border-blue-400',
    border: 'focus-within:border-blue-200 focus-within:bg-white',
    badge: 'bg-blue-50 text-blue-700',
    check: 'border-blue-500 bg-blue-600 text-white',
  },
  rose: {
    ring: 'focus:ring-rose-500/30 focus:border-rose-400',
    border: 'focus-within:border-rose-200 focus-within:bg-white',
    badge: 'bg-rose-50 text-rose-700',
    check: 'border-rose-500 bg-rose-500 text-white',
  },
};

export function buildMaterialLookupLabel(material: MaterialDto) {
  return `${material.materialCode} · ${material.materialName}`;
}

function sortMaterials(left: MaterialDto, right: MaterialDto) {
  return left.materialName.localeCompare(right.materialName, 'ko-KR')
    || left.materialCode.localeCompare(right.materialCode, 'ko-KR');
}

export default function MaterialLookupField({
  materials,
  inputValue,
  selectedCode,
  accent = 'blue',
  placeholder = '자재명 또는 자재코드로 검색',
  onInputValueChange,
  onSelectionChange,
}: MaterialLookupFieldProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>(() => getFavoriteMaterialCodes());
  const [recentCodes, setRecentCodes] = useState<string[]>(() => getRecentMaterialCodes());
  const [worklistCodes, setWorklistCodes] = useState<string[]>(() => getMaterialWorklistCodes());
  const accentStyles = ACCENT_STYLES[accent];
  const selectedMaterial = materials.find((material) => material.materialCode === selectedCode) ?? null;
  const normalizedQuery = inputValue.trim().toLowerCase();
  const favoriteCodeSet = useMemo(() => new Set(favoriteCodes), [favoriteCodes]);
  const worklistCodeSet = useMemo(() => new Set(worklistCodes), [worklistCodes]);
  const recentCodeOrder = useMemo(
    () => new Map(recentCodes.map((code, index) => [code, index])),
    [recentCodes],
  );

  useEffect(() => subscribeMaterialPreferences((preferences) => {
    setFavoriteCodes(preferences.favorites);
    setRecentCodes(preferences.recent);
  }), []);
  useEffect(() => subscribeMaterialWorklist(setWorklistCodes), []);

  const filteredMaterials = useMemo(() => {
    const source = [...materials].sort((left, right) => {
      const leftWorklistRank = worklistCodeSet.has(left.materialCode) ? 0 : 1;
      const rightWorklistRank = worklistCodeSet.has(right.materialCode) ? 0 : 1;
      if (leftWorklistRank !== rightWorklistRank) {
        return leftWorklistRank - rightWorklistRank;
      }

      const leftFavoriteRank = favoriteCodeSet.has(left.materialCode) ? 0 : 1;
      const rightFavoriteRank = favoriteCodeSet.has(right.materialCode) ? 0 : 1;
      if (leftFavoriteRank !== rightFavoriteRank) {
        return leftFavoriteRank - rightFavoriteRank;
      }

      const leftRecentRank = recentCodeOrder.get(left.materialCode) ?? Number.MAX_SAFE_INTEGER;
      const rightRecentRank = recentCodeOrder.get(right.materialCode) ?? Number.MAX_SAFE_INTEGER;
      if (leftRecentRank !== rightRecentRank) {
        return leftRecentRank - rightRecentRank;
      }

      return sortMaterials(left, right);
    });
    if (!normalizedQuery) {
      return source.slice(0, 10);
    }

    return source
      .filter((material) =>
        [material.materialCode, material.materialName, sanitizeLocation(material.location)]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 10);
  }, [favoriteCodeSet, materials, normalizedQuery, recentCodeOrder, worklistCodeSet]);

  const worklistSuggestions = useMemo(
    () =>
      worklistCodes
        .map((code) => materials.find((material) => material.materialCode === code))
        .filter((material): material is MaterialDto => Boolean(material))
        .slice(0, 4),
    [materials, worklistCodes],
  );
  const favoriteSuggestions = useMemo(
    () =>
      favoriteCodes
        .filter((code) => !worklistCodeSet.has(code))
        .map((code) => materials.find((material) => material.materialCode === code))
        .filter((material): material is MaterialDto => Boolean(material))
        .slice(0, 4),
    [favoriteCodes, materials, worklistCodeSet],
  );
  const recentSuggestions = useMemo(
    () =>
      recentCodes
        .filter((code) => !favoriteCodeSet.has(code) && !worklistCodeSet.has(code))
        .map((code) => materials.find((material) => material.materialCode === code))
        .filter((material): material is MaterialDto => Boolean(material))
        .slice(0, 4),
    [favoriteCodeSet, materials, recentCodes, worklistCodeSet],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery, open]);

  const selectMaterial = (material: MaterialDto) => {
    onSelectionChange(material);
    onInputValueChange(buildMaterialLookupLabel(material));
    setOpen(false);
  };

  const handleInputChange = (nextValue: string) => {
    onInputValueChange(nextValue);
    if (selectedMaterial && nextValue.trim() !== buildMaterialLookupLabel(selectedMaterial)) {
      onSelectionChange(null);
    }
    setOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredMaterials.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(filteredMaterials.length - 1, current + 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const nextMaterial = filteredMaterials[activeIndex] ?? filteredMaterials[0];
      if (nextMaterial) {
        selectMaterial(nextMaterial);
      }
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className={`flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/85 px-3 transition ${accentStyles.border}`}>
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 ${accentStyles.ring}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="자재 검색"
          autoComplete="off"
        />
        <ChevronsUpDown size={16} className="shrink-0 text-slate-300" />
      </label>

      {selectedMaterial && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500 shadow-sm">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${accentStyles.badge}`}>선택된 자재</span>
          <span className="font-semibold text-slate-800">{selectedMaterial.materialName}</span>
          <span>{selectedMaterial.materialCode}</span>
          <span>위치 {formatLocation(selectedMaterial.location)}</span>
          {favoriteCodeSet.has(selectedMaterial.materialCode) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              <Star size={12} className="fill-current" />
              즐겨찾기
            </span>
          )}
          {worklistCodeSet.has(selectedMaterial.materialCode) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
              <Check size={12} />
              작업 바구니
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
          {!normalizedQuery && (worklistSuggestions.length > 0 || favoriteSuggestions.length > 0 || recentSuggestions.length > 0) && (
            <div className="mb-3 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3">
              {worklistSuggestions.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">작업 바구니</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {worklistSuggestions.map((material) => (
                      <button
                        key={material.materialCode}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectMaterial(material)}
                        className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        {material.materialName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {favoriteSuggestions.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">즐겨찾기</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {favoriteSuggestions.map((material) => (
                      <button
                        key={material.materialCode}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectMaterial(material)}
                        className="rounded-full border border-amber-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-200 hover:bg-amber-50"
                      >
                        {material.materialName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recentSuggestions.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">최근 사용</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recentSuggestions.map((material) => (
                      <button
                        key={material.materialCode}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectMaterial(material)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        {material.materialName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {filteredMaterials.length > 0 ? (
            <ul role="listbox" className="space-y-1">
              {filteredMaterials.map((material, index) => {
                const checked = material.materialCode === selectedCode;
                const active = index === activeIndex;
                const favorite = favoriteCodeSet.has(material.materialCode);
                const queued = worklistCodeSet.has(material.materialCode);
                return (
                  <li key={material.materialCode}>
                    <div
                      className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        active
                          ? 'border border-slate-200 bg-slate-50'
                          : 'border border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectMaterial(material)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            checked ? accentStyles.check : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <Check size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{material.materialName}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            <span>
                              {material.materialCode} · 현재 {(material.currentStockQty ?? 0).toLocaleString()} EA
                              {sanitizeLocation(material.location) ? ` · ${formatLocation(material.location)}` : ''}
                            </span>
                            {favorite && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                즐겨찾기
                              </span>
                            )}
                            {queued && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                작업 바구니
                              </span>
                            )}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setWorklistCodes(toggleMaterialWorklistCode(material.materialCode))}
                        className={`chat-focus-ring mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                          queued
                            ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                            : 'border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-500'
                        }`}
                        aria-label={queued ? '작업 바구니에서 제거' : '작업 바구니에 추가'}
                        title={queued ? '작업 바구니에서 제거' : '작업 바구니에 추가'}
                      >
                        {queued ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setFavoriteCodes(toggleFavoriteMaterialCode(material.materialCode))}
                        className={`chat-focus-ring mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                          favorite
                            ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                            : 'border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-500'
                        }`}
                        aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        title={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                      >
                        <Star size={14} className={favorite ? 'fill-current' : ''} />
                      </button>
                      <MapPin size={14} className="mt-2 shrink-0 text-slate-300" />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              조건에 맞는 자재가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
