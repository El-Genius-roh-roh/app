export default function Loading() {
  return (
    <main className="page animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-40 rounded-2xl bg-black/10" />
        <div className="h-9 w-28 rounded-full bg-black/10" />
      </div>
      <div className="h-6 w-32 rounded-xl bg-black/10" />
      <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-28 bg-black/5" />
        ))}
      </div>
    </main>
  );
}
