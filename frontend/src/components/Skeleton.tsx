import type React from 'react';

const Skeleton: React.FC = () => (
  <div className="flex h-screen items-center justify-center text-slate-400">
    <div className="animate-pulse">
      <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
      <div className="h-40 w-72 bg-slate-200 rounded" />
    </div>
  </div>
);

export default Skeleton;
