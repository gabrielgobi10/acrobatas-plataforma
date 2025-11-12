export default function ProfissionalSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-zinc-200 bg-white bg-gray-100 p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-zinc-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-zinc-200" />
              <div className="h-3 w-16 rounded bg-zinc-200" />
            </div>
          </div>
          <div className="mb-3 h-3 w-32 rounded bg-zinc-200" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-8 rounded bg-zinc-100" />
            <div className="h-8 rounded bg-zinc-100" />
          </div>
          <div className="mt-4 h-6 w-full rounded bg-zinc-200" />
        </div>
      ))}
    </div>
  );
}
