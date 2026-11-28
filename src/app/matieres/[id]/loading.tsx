/** Skeleton de chargement pour la page matière. */
export default function Loading() {
  return (
    <main className="page animate-pulse" aria-busy="true" aria-label="Chargement de la matière…">
      <div className="h-5 w-16 rounded bg-surface-2" />
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-surface-2" />
        <div className="h-10 w-48 rounded-lg bg-surface-2" />
      </div>
      <div className="h-40 rounded-[22px] bg-surface-2" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-16 rounded-[18px] bg-surface-2" />)}
      </div>
    </main>
  );
}
