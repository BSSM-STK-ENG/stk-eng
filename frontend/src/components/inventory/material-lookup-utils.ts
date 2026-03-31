import type { MaterialDto } from '../../types/api';

export function buildMaterialLookupLabel(material: MaterialDto) {
  return `${material.materialCode} · ${material.materialName}`;
}
