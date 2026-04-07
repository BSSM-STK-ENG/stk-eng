import { Info } from 'lucide-react';

type InfoTooltipProps = {
  label: string;
};

export default function InfoTooltip({ label }: InfoTooltipProps) {
  return (
    <span className="group relative inline-flex items-center">
      <span
        tabIndex={0}
        className="chat-focus-ring inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400"
        aria-label={label}
      >
        <Info size={12} />
      </span>
      <span className="absolute bottom-[calc(100%+8px)] left-1/2 z-20 min-w-[200px] -translate-x-1/2 rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-[11px] font-medium leading-5 text-white shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-150">
        {label}
      </span>
    </span>
  );
}
