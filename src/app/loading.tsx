export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/15 border-t-blue-500" />
        <div className="text-sm font-semibold text-slate-400">
          Loading…
        </div>
      </div>
    </div>
  );
}
