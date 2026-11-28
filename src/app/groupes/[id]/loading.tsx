export default function Loading() {
  return (
    <main className="page animate-pulse">
      <div className="h-5 w-20 rounded-lg bg-black/10" />
      <div className="hero h-32 opacity-75" />
      <div className="h-10 max-w-md rounded-xl bg-black/10" />
      <div className="space-y-5 lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0">
        <div className="space-y-2 lg:col-span-2">
          {[1, 2, 3].map((i) => <div key={i} className="card h-16 bg-black/5" />)}
        </div>
        <div className="card h-72 bg-black/5 lg:col-span-3" />
      </div>
    </main>
  );
}
