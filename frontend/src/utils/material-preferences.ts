import { getStoredEmail } from './auth-session';

export interface MaterialPreferences {
  favorites: string[];
  recent: string[];
}

const STORAGE_PREFIX = 'stk-material-preferences';
const CHANGE_EVENT_NAME = 'stk-material-preferences-change';
const MAX_RECENT_CODES = 6;

function getStorageKey() {
  const email = getStoredEmail();
  return `${STORAGE_PREFIX}:${email || 'anonymous'}`;
}

function sanitizeMaterialCode(materialCode: string) {
  return materialCode.trim();
}

function uniqueCodes(codes: string[]) {
  return Array.from(new Set(codes.map(sanitizeMaterialCode).filter(Boolean)));
}

function getDefaultPreferences(): MaterialPreferences {
  return {
    favorites: [],
    recent: [],
  };
}

function dispatchPreferencesChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(CHANGE_EVENT_NAME));
}

function readPreferences(): MaterialPreferences {
  if (typeof window === 'undefined') {
    return getDefaultPreferences();
  }

  const rawValue = window.localStorage.getItem(getStorageKey());
  if (!rawValue) {
    return getDefaultPreferences();
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<MaterialPreferences>;
    return {
      favorites: uniqueCodes(Array.isArray(parsed.favorites) ? parsed.favorites : []),
      recent: uniqueCodes(Array.isArray(parsed.recent) ? parsed.recent : []).slice(0, MAX_RECENT_CODES),
    };
  } catch {
    return getDefaultPreferences();
  }
}

function writePreferences(nextPreferences: MaterialPreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized: MaterialPreferences = {
    favorites: uniqueCodes(nextPreferences.favorites),
    recent: uniqueCodes(nextPreferences.recent).slice(0, MAX_RECENT_CODES),
  };

  window.localStorage.setItem(getStorageKey(), JSON.stringify(normalized));
  dispatchPreferencesChanged();
}

export function getMaterialPreferences() {
  return readPreferences();
}

export function getFavoriteMaterialCodes() {
  return readPreferences().favorites;
}

export function getRecentMaterialCodes() {
  return readPreferences().recent;
}

export function isFavoriteMaterialCode(materialCode: string) {
  const normalizedCode = sanitizeMaterialCode(materialCode);
  return getFavoriteMaterialCodes().includes(normalizedCode);
}

export function toggleFavoriteMaterialCode(materialCode: string) {
  const normalizedCode = sanitizeMaterialCode(materialCode);
  if (!normalizedCode) {
    return getFavoriteMaterialCodes();
  }

  const preferences = readPreferences();
  const favorites = preferences.favorites.includes(normalizedCode)
    ? preferences.favorites.filter((code) => code !== normalizedCode)
    : [normalizedCode, ...preferences.favorites];

  writePreferences({
    ...preferences,
    favorites,
  });

  return favorites;
}

export function registerRecentMaterialCode(materialCode: string) {
  const normalizedCode = sanitizeMaterialCode(materialCode);
  if (!normalizedCode) {
    return getRecentMaterialCodes();
  }

  const preferences = readPreferences();
  const nextRecent = [normalizedCode, ...preferences.recent.filter((code) => code !== normalizedCode)].slice(0, MAX_RECENT_CODES);

  writePreferences({
    ...preferences,
    recent: nextRecent,
  });

  return nextRecent;
}

export function subscribeMaterialPreferences(listener: (preferences: MaterialPreferences) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleChange = () => {
    listener(readPreferences());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === getStorageKey()) {
      listener(readPreferences());
    }
  };

  window.addEventListener(CHANGE_EVENT_NAME, handleChange as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT_NAME, handleChange as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
}
