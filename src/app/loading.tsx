export default function Loading() {
  return (
    <main className="min-h-screen bg-[#020617] px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center overflow-hidden">
      
      {/* Ultra-Premium Glowing Brand Section */}
      <div className="flex flex-col items-center justify-center mt-8 mb-12 relative z-10">
        
        {/* Outer Glow Ring */}
        <div className="absolute h-36 w-36 rounded-full bg-cyan-500/20 blur-2xl"></div>
        
        {/* Main Solid Glass Box with Clear Visible Star */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-bounce duration-1000">
          
          {/* Crystal Clear Glowing Star Symbol */}
          <span className="text-5xl text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,1)] font-black select-none">✦</span>
        </div>
        
        {/* Ultra-Bold TechStar Text with Multi-Color Glow */}
        <h2 className="mt-6 text-3xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-400 uppercase drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]">
          TechStar
        </h2>

        {/* Futuristic Badge */}
        <div className="mt-3 flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-[11px] font-bold tracking-widest text-cyan-300 uppercase">
            Loading Universe...
          </span>
        </div>
      </div>

      {/* Skeleton Shimmer Grid Section */}
      <div className="w-full max-w-6xl relative z-0">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-xl">
              <div className="h-32 sm:h-40 w-full rounded-2xl bg-slate-800/80 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
              <div className="mt-5 h-4 w-3/4 rounded-full bg-slate-800 animate-pulse"></div>
              <div className="mt-2.5 h-3 w-1/2 rounded-full bg-slate-800/70 animate-pulse"></div>
              <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                <div className="h-5 w-24 rounded-full bg-slate-800 animate-pulse"></div>
                <div className="h-9 w-9 rounded-xl bg-slate-800 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
