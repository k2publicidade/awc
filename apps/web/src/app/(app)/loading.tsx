export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 pb-8" aria-busy="true" aria-label="Carregando página">
      <div>
        <div className="mb-3 h-3 w-44 animate-pulse rounded bg-slate-200/80" />
        <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-96 max-w-full animate-pulse rounded bg-slate-200/70" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="awc-card p-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 animate-pulse rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="awc-card p-6">
        <div className="mb-5 h-4 w-48 animate-pulse rounded bg-slate-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-4 flex items-center gap-6">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
