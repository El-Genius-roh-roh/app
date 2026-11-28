export default function Loading() {
  return (
    <main className="page animate-pulse">
      <div className="h-5 w-20 rounded-lg bg-black/10" />
      <div className="hero h-40 opacity-75" />
      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <div className="card h-80 bg-black/5" />
        <div className="space-y-4">
          <div className="card h-44 bg-black/5" />
          <div className="card h-44 bg-black/5" />
        </div>
      </div>
    </main>
  );
}
