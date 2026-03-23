import { getStoredEmail } from './auth-session';

const STORAGE_PREFIX = 'stk-material-worklist';
const CHANGE_EVENT_NAME = 'stk-material-worklist-change';
const MAX_WORKLIST_CODES = 8;

function getStorageKey() {
  const email = getStoredEmail();
  return `${STORAGE_PREFIX}:${email || 'anonymous'}`;
}

function sanitizeMaterialCode(materialCode: string) {
  return materialCode.trim();
}

function normalizeCodes(codes: string[]) {
  return Array.from(new Set(codes.map(sanitizeMaterialCode).filter(Boolean))).slice(0, MAX_WORKLIST_CODES);
}

function readWorklist() {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  const rawValue = window.localStorage.getItem(getStorageKey());
  if (!rawValue) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? normalizeCodes(parsed) : [];
  } catch {
    return [];
  }
}

function dispatchWorklistChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(CHANGE_EVENT_NAME));
}

function writeWorklist(nextCodes: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedCodes = normalizeCodes(nextCodes);
  window.localStorage.setItem(getStorageKey(), JSON.stringify(normalizedCodes));
  dispatchWorklistChanged();
}

export function getMaterialWorklistCodes() {
  return readWorklist();
}

export function isMaterialInWorklist(materialCode: string) {
  const normalizedCode = sanitizeMaterialCode(materialCode);
  return getMaterialWorklistCodes().includes(normalizedCode);
}

export function toggleMaterialWorklistCode(materialCode: string) {
  const normalizedCode = sanitizeMaterialCode(materialCode);
  if (!normalizedCode) {
    return getMaterialWorklistCodes();
  }

  const worklistCodes = readWorklist();
  const nextCodes = worklistCodes.includes(normalizedCode)
    ? worklistCodes.filter((code) => code !== normalizedCode)
    : [normalizedCode, ...worklistCodes];

  writeWorklist(nextCodes);
  return normalizeCodes(nextCodes);
}

export function addMaterialWorklistCodes(materialCodes: string[]) {
  const nextCodes = normalizeCodes([...materialCodes, ...readWorklist()]);
  writeWorklist(nextCodes);
  return nextCodes;
}

export function clearMaterialWorklist() {
  writeWorklist([]);
  return [];
}

export function subscribeMaterialWorklist(listener: (materialCodes: string[]) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleChange = () => {
    listener(readWorklist());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === getStorageKey()) {
      listener(readWorklist());
    }
  };

  window.addEventListener(CHANGE_EVENT_NAME, handleChange as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT_NAME, handleChange as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
}
