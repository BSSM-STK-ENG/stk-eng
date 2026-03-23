import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getFavoriteMaterialCodes,
  getRecentMaterialCodes,
  getMaterialPreferences,
  registerRecentMaterialCode,
  toggleFavoriteMaterialCode,
} from '../material-preferences';

vi.mock('../auth-session', () => ({
  getStoredEmail: vi.fn(() => 'qa-user@stk.local'),
}));

describe('material-preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggles favorite material codes', () => {
    expect(getFavoriteMaterialCodes()).toEqual([]);

    toggleFavoriteMaterialCode('MAT-001');
    expect(getFavoriteMaterialCodes()).toEqual(['MAT-001']);

    toggleFavoriteMaterialCode('MAT-001');
    expect(getFavoriteMaterialCodes()).toEqual([]);
  });

  it('keeps recent materials unique and ordered by most recent', () => {
    registerRecentMaterialCode('MAT-001');
    registerRecentMaterialCode('MAT-002');
    registerRecentMaterialCode('MAT-001');

    expect(getRecentMaterialCodes()).toEqual(['MAT-001', 'MAT-002']);
  });

  it('returns normalized preferences from storage', () => {
    toggleFavoriteMaterialCode('MAT-003');
    registerRecentMaterialCode('MAT-004');

    expect(getMaterialPreferences()).toEqual({
      favorites: ['MAT-003'],
      recent: ['MAT-004'],
    });
  });
});
