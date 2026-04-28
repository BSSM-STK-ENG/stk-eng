import { Camera, ImagePlus, Loader2, Search, UploadCloud, X } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import type { ImageSearchResult, MaterialDto } from '../../types/api';
import { getErrorMessage } from '../../utils/api-error';
import { isLowStockMaterial } from '../../utils/stock-alerts';

type MaterialImagePickerModalProps = {
  open: boolean;
  title: string;
  allowedMaterials: MaterialDto[];
  onClose: () => void;
  onSelect: (material: MaterialDto) => void;
};

export default function MaterialImagePickerModal({
  open,
  title,
  allowedMaterials,
  onClose,
  onSelect,
}: MaterialImagePickerModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  if (!open) {
    return null;
  }

  const allowedCodes = new Set(allowedMaterials.map((material) => material.materialCode));

  const searchWithFile = async (file: File) => {
    if (!file) {
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const imageData = reader.result as string;
        setPreviewImage(imageData);
        const response = await api.post<ImageSearchResult[]>('/materials/search/image', { imageData });
        setResults(response.data.filter((result) => allowedCodes.has(result.material.materialCode)));
      } catch (requestError) {
        setError(`이미지 검색에 실패했습니다. ${getErrorMessage(requestError)}`);
      } finally {
        setLoading(false);
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await searchWithFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await searchWithFile(file);
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">
              <ImagePlus size={13} />
              이미지 검색
            </p>
            <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] text-white">{title}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              자재 사진을 올리면 DB에 저장된 썸네일과 비교해 가장 비슷한 자재를 먼저 보여줍니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              disabled={loading}
              className={`chat-focus-ring flex min-h-[300px] w-full flex-col items-center justify-center rounded-[22px] border border-dashed px-6 text-center transition ${
                dragActive
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-slate-50/90 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/70'
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                {loading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
              </span>
              <span className="text-base font-bold text-slate-900">
                {loading ? '이미지를 분석 중입니다' : '사진을 여기에 놓거나 클릭하세요'}
              </span>
              <span className="mt-2 text-sm leading-6 text-slate-500">
                JPG, PNG 같은 이미지 파일을 올리면 유사도 순으로 자재를 정렬합니다.
              </span>
              {selectedFileName && (
                <span className="mt-4 max-w-full truncate rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  {selectedFileName}
                </span>
              )}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">검색 범위</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                표시 대상 {allowedMaterials.length.toLocaleString()}개 자재
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                현재 화면에서 선택 가능한 자재만 결과에 보여줍니다.
              </p>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            {previewImage && (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <img
                  src={previewImage}
                  alt="검색 이미지 미리보기"
                  className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">검색 이미지가 준비됐습니다.</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{selectedFileName}</p>
                </div>
              </div>
            )}

            {results.length === 0 && !loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 text-center shadow-sm">
                <Search size={28} className="text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {hasSearched ? '선택 가능한 유사 자재가 없습니다.' : '검색할 이미지를 올려주세요.'}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {hasSearched
                    ? '다른 각도나 더 선명한 사진으로 다시 검색해보세요.'
                    : '유사도 순으로 결과를 정렬해서 바로 선택할 수 있게 보여줍니다.'}
                </p>
              </div>
            ) : (
              <div className="grid max-h-[60dvh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                {results.map((result) => {
                  const material = result.material;
                  const lowStock = isLowStockMaterial(material);
                  return (
                    <button
                      key={material.materialCode}
                      type="button"
                      onClick={() => onSelect(material)}
                      className="chat-focus-ring relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                    >
                      <span
                        className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold ${result.similarity >= 80 ? 'bg-emerald-500 text-white' : result.similarity >= 55 ? 'bg-amber-400 text-white' : 'bg-slate-500 text-white'}`}
                      >
                        {result.similarity}%
                      </span>
                      <div className="aspect-square w-full bg-slate-100">
                        {material.imageUrl ? (
                          <img
                            src={material.imageUrl}
                            alt={material.materialName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <Camera size={28} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <p className="truncate text-sm font-bold text-slate-900">{material.materialName}</p>
                        <p className="truncate text-[11px] text-slate-400">{material.materialCode}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          현재 {material.currentStockQty?.toLocaleString() ?? 0} EA
                        </p>
                        {lowStock && <p className="text-[11px] font-bold text-amber-600">안전재고 이하</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
