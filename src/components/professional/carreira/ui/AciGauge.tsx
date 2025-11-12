// src/components/professional/CentralDeNavegacaoProfissional/Carreira/components/AciGauge.tsx
export default function AciGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  const color =
    pct < 40 ? "#ef4444" :
    pct < 60 ? "#f59e0b" :
    pct < 80 ? "#3b82f6" :
    "#10b981";

  const label =
    pct < 40 ? "Risco" :
    pct < 60 ? "Em evolução" :
    pct < 80 ? "Profissional" :
    "Mestre";

  return (
    <div
      className="
        relative grid place-items-center 
        w-[160px] h-[160px]
        sm:w-[180px] sm:h-[180px]
        mx-auto
      "
    >
      {/* SVG circular */}
      <svg
        className="w-full h-full rotate-[-90deg]"
        viewBox="0 0 200 200"
      >
        <circle
          cx="100"
          cy="100"
          r={70}
          stroke="#1f2937"
          strokeOpacity="0.2"
          strokeWidth="14"
          fill="none"
        />
        <circle
          cx="100"
          cy="100"
          r={70}
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          fill="none"
        />
      </svg>

      {/* Texto central */}
      <div className="absolute text-center">
        <div
          className="
            text-3xl sm:text-4xl font-extrabold
          "
          style={{ color }}
        >
          {pct}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5">
          ACI
        </div>
        <div
          className="
            text-[10px] sm:text-[11px]
            mt-1 px-2 py-0.5
            rounded-full
            bg-slate-100 dark:bg-slate-700/70
            text-slate-600 dark:text-slate-300
          "
        >
          {label}
        </div>
      </div>
    </div>
  );
}
