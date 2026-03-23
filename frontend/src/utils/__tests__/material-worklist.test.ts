import {
  addMaterialWorklistCodes,
  clearMaterialWorklist,
  getMaterialWorklistCodes,
  isMaterialInWorklist,
  toggleMaterialWorklistCode,
} from '../material-worklist';

describe('material-worklist', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds unique codes to the worklist and preserves order', () => {
    const nextCodes = addMaterialWorklistCodes(['MAT-003', 'MAT-002', 'MAT-003', 'MAT-001']);

    expect(nextCodes).toEqual(['MAT-003', 'MAT-002', 'MAT-001']);
    expect(getMaterialWorklistCodes()).toEqual(['MAT-003', 'MAT-002', 'MAT-001']);
  });

  it('toggles codes in and out of the worklist', () => {
    toggleMaterialWorklistCode('MAT-100');
    expect(isMaterialInWorklist('MAT-100')).toBe(true);

    toggleMaterialWorklistCode('MAT-100');
    expect(isMaterialInWorklist('MAT-100')).toBe(false);
  });

  it('clears the worklist', () => {
    addMaterialWorklistCodes(['MAT-001', 'MAT-002']);
    clearMaterialWorklist();

    expect(getMaterialWorklistCodes()).toEqual([]);
  });
});
