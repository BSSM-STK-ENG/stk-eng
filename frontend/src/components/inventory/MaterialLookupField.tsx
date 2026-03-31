import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { MaterialDto } from '../../types/api';
import { formatLocation, sanitizeLocation } from '../../utils/inventory-display';

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
  const accentStyles = ACCENT_STYLES[accent];
  const selectedMaterial = materials.find((material) => material.materialCode === selectedCode) ?? null;
  const normalizedQuery = inputValue.trim().toLowerCase();

  const filteredMaterials = useMemo(() => {
    if (!normalizedQuery) {
      return [] as MaterialDto[];
    }

    const source = [...materials].sort(sortMaterials);
    return source
      .filter((material) =>
        [material.materialCode, material.materialName, material.description, sanitizeLocation(material.location)]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 12);
  }, [materials, normalizedQuery]);

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
    setOpen(nextValue.trim().length > 0);
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
    <div className="relative">
      <label className={`flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition ${accentStyles.border}`}>
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            if (normalizedQuery && !selectedMaterial) {
              setOpen(true);
            }
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 ${accentStyles.ring}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="자재 검색"
          autoComplete="off"
        />
      </label>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
          {filteredMaterials.length > 0 ? (
            <ul role="listbox" className="max-h-72 space-y-1 overflow-y-auto">
              {filteredMaterials.map((material, index) => {
                const checked = material.materialCode === selectedCode;
                const active = index === activeIndex;
                return (
                  <li key={material.materialCode}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectMaterial(material)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? 'border border-slate-200 bg-slate-50'
                          : 'border border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          checked ? accentStyles.check : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">{material.materialName}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {material.materialCode}
                          {` · 현재 ${(material.currentStockQty ?? 0).toLocaleString()} EA`}
                          {sanitizeLocation(material.location) ? ` · 위치 ${formatLocation(material.location)}` : ''}
                        </span>
                        {material.description && (
                          <span className="mt-1 block truncate text-[11px] text-slate-400">
                            {material.description}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              검색어에 맞는 자재가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
