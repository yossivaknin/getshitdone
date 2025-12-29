export function Logo() {
  return (
    <div className="flex items-center gap-3">
      {/* The Icon */}
      <div className="relative flex h-8 w-8 items-center justify-center rounded-sm bg-slate-900 text-emerald-500">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      {/* The Text */}
      <div className="flex items-baseline gap-1">
        <span className="font-space-grotesk text-xl font-bold tracking-tight text-slate-900">
          SITREP
        </span>
        <span className="font-mono text-sm font-medium text-slate-400">
          // HQ
        </span>
      </div>
    </div>
  );
}

