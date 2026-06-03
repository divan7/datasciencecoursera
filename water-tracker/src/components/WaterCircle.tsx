interface Props {
  percentage: number;
  consumedMl: number;
  goalMl: number;
}

export function WaterCircle({ percentage, consumedMl, goalMl }: Props) {
  const pct = Math.min(100, Math.max(0, percentage));

  return (
    <div className="relative w-60 h-60 mx-auto select-none" aria-label={`${Math.round(pct)}% de meta de hidratación`}>
      {/* Outer glow */}
      <div
        className="absolute -inset-3 rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle, rgba(56,189,248,${pct / 300}) 0%, transparent 70%)`,
          filter: 'blur(12px)',
        }}
      />

      {/* Main circle */}
      <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-sky-400/30 shadow-[0_0_60px_rgba(14,165,233,0.25)]">
        {/* Background */}
        <div className="absolute inset-0 bg-sky-950/70" />

        {/* Water fill */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
          style={{ height: `${pct}%` }}
        >
          {/* Wave 1 */}
          <div
            className="absolute -top-5 h-5 left-0 pointer-events-none"
            style={{ width: '200%', animation: 'wave1 3s linear infinite' }}
          >
            <svg viewBox="0 0 800 20" className="w-full h-full" preserveAspectRatio="none">
              <path
                d="M0,10 C100,0 200,20 300,10 C400,0 500,20 600,10 C700,0 800,20 800,10 L800,20 L0,20 Z"
                fill="#38bdf8"
                fillOpacity="0.85"
              />
            </svg>
          </div>
          {/* Wave 2 */}
          <div
            className="absolute -top-3 h-3 left-0 pointer-events-none"
            style={{ width: '200%', animation: 'wave1 4.5s linear infinite reverse' }}
          >
            <svg viewBox="0 0 800 16" className="w-full h-full" preserveAspectRatio="none">
              <path
                d="M0,8 C100,16 200,0 300,8 C400,16 500,0 600,8 C700,16 800,0 800,8 L800,16 L0,16 Z"
                fill="#0ea5e9"
                fillOpacity="0.5"
              />
            </svg>
          </div>
          {/* Water body */}
          <div className="absolute inset-0 top-3 bg-gradient-to-b from-sky-400/80 to-sky-700/90" />
        </div>

        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white">
          <span className="text-5xl font-black tabular-nums leading-none">{Math.round(pct)}%</span>
          <span className="text-base font-semibold mt-2 tabular-nums">
            {consumedMl.toLocaleString('es')} ml
          </span>
          <span className="text-xs text-sky-200/80 tabular-nums">
            de {goalMl.toLocaleString('es')} ml
          </span>
        </div>
      </div>
    </div>
  );
}
