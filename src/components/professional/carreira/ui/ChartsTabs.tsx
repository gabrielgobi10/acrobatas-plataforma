import { useState } from "react";
import Card from "./Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Star, TrendingUp, LineChart as LineIcon } from "lucide-react";
import { SeriePoint } from "../types";

export default function ChartsTabs({
  xp,
  rating,
  horas,
}: {
  xp: SeriePoint[];
  rating: SeriePoint[];
  horas: SeriePoint[];
}) {
  const [tab, setTab] = useState<"xp" | "rating" | "horas">("xp");

  const TabBtn = ({ k, label, Icon }: any) => (
    <button
      onClick={() => setTab(k)}
      className={`
        text-xs sm:text-sm 
        px-2.5 sm:px-3 py-1.5 sm:py-2 
        rounded-lg flex items-center justify-center gap-1.5 sm:gap-2
        transition-colors
        ${tab === k
          ? "bg-blue-500/15 text-blue-500"
          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}
      `}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="hidden xs:inline">{label}</span>
    </button>
  );

  return (
    <Card className="p-0 overflow-hidden">
      {/* ======= Tabs ======= */}
      <div
        className="
          flex flex-wrap items-center justify-center sm:justify-start 
          gap-2 sm:gap-3 px-3 sm:px-4 pt-3 sm:pt-4
        "
      >
        <TabBtn k="xp" label="XP" Icon={TrendingUp} />
        <TabBtn k="rating" label="Avaliações" Icon={Star} />
        <TabBtn k="horas" label="Horas" Icon={LineIcon} />
      </div>

      {/* ======= Gráfico ======= */}
      <div
        className="
          px-2 sm:px-4 
          pb-3 sm:pb-4 
          pt-1 sm:pt-2 
          h-[220px] sm:h-[320px]
        "
      >
        {tab === "xp" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={xp}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="xp"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {tab === "rating" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rating}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
              <YAxis domain={[4, 5]} stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="nota"
                stroke="#fbbf24"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {tab === "horas" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={horas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="planejadas" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizadas" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
