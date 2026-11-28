/** Skeleton de chargement pour la page du groupe. */
export default function Loading() {
  return (
    <main className="page animate-pulse" aria-busy="true" aria-label="Chargement du groupe…">
      <div className="h-5 w-16 rounded bg-surface-2" />
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-surface-2" />
        <div className="h-10 w-56 rounded-lg bg-surface-2" />
      </div>
      <div className="h-12 max-w-md rounded-[14px] bg-surface-2" />
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-16 rounded-[18px] bg-surface-2" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-14 rounded-[18px] bg-surface-2" />)}
        </div>
      </div>
    </main>
  );
}
