/** Skeleton de chargement pour la page d'accueil. */
export default function Loading() {
  return (
    <main className="page animate-pulse" aria-busy="true" aria-label="Chargement…">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-surface-2" />
        <div className="h-10 w-72 rounded-lg bg-surface-2" />
      </div>
      <div className="space-y-7 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-10 lg:space-y-0">
        <div className="space-y-5">
          <div className="h-52 rounded-[22px] bg-surface-2" />
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-16 rounded-[18px] bg-surface-2" />)}
          </div>
        </div>
        <div className="space-y-5">
          <div className="h-6 w-32 rounded bg-surface-2" />
          {Array.from({ length: 2 }, (_, i) => <div key={i} className="h-20 rounded-[18px] bg-surface-2" />)}
        </div>
      </div>
    </main>
  );
}
