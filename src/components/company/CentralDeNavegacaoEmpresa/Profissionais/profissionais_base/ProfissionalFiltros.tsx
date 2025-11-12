import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, SortDesc, ChevronDown, X } from "lucide-react";
import { statusLabel } from "./utils";

export default function ProfissionalFiltros({
  q,
  setQ,
  funcao,
  setFuncao,
  funcoesDisponiveis,
  local,
  setLocal,
  disp,
  setDisp,
  minRating,
  setMinRating,
  ordenar,
  setOrdenar,
}: any) {
  const [openFilter, setOpenFilter] = useState(false);
  const [openSort, setOpenSort] = useState(false);

  return (
    <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
      {/* 🔍 Campo de busca */}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white bg-gray-100 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 md:w-80"
          placeholder="Buscar por nome, função, habilidade…"
        />
        <span className="pointer-events-none absolute left-3 top-2.5 text-zinc-400">
          🔍
        </span>
      </div>

      {/* 🔧 Filtros */}
      <div className="flex gap-2">
        <Dropdown
          icon={<Filter className="h-4 w-4" />}
          label="Filtros"
          open={openFilter}
          setOpen={setOpenFilter}
        >
          <div className="space-y-3 p-3">
            <SelectRow label="Função" value={funcao} onChange={setFuncao} options={funcoesDisponiveis} />
            <InputRow label="Local (cidade)" value={local} onChange={setLocal} placeholder="Lisboa" />
            <SelectRow
              label="Disponibilidade"
              value={disp}
              onChange={(v: string) => setDisp(v as any)}
              options={["todas", "disponivel", "em_obra", "indisponivel"]}
            />
            <div>
              <span className="mb-1 block text-xs font-medium text-zinc-600">Rating mínimo</span>
              <div className="flex items-center gap-2">
                {[0, 3, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    className={`rounded-lg border px-2 py-1 text-xs ${
                      minRating === r
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200"
                    }`}
                    onClick={() => setMinRating(r)}
                  >
                    {r === 0 ? "Qualquer" : `${r}+ ⭐`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Dropdown>

        {/* 🔽 Ordenar */}
        <Dropdown
          icon={<SortDesc className="h-4 w-4" />}
          label="Ordenar"
          open={openSort}
          setOpen={setOpenSort}
        >
          <div className="p-3">
            <RadioCol
              value={ordenar}
              onChange={(v: string) => setOrdenar(v as any)}
              options={[
                { value: "relevancia", label: "Relevância" },
                { value: "rating", label: "Maior rating" },
                { value: "experiencia", label: "Mais experiente" },
                { value: "valor", label: "Menor valor/hora" },
              ]}
            />
          </div>
        </Dropdown>
      </div>
    </div>
  );
}

function Dropdown({ icon, label, children, open, setOpen }: any) {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o: boolean) => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white bg-white px-3 py-2 text-sm hover:bg-zinc-50"
      >
        {icon}
        {label}
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 shadow-lg"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: any) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
      >
        {options.map((o: string) => (
          <option key={o} value={o}>
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputRow({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
      />
    </div>
  );
}

function RadioCol({ value, onChange, options }: any) {
  return (
    <div className="grid gap-2">
      {options.map((opt: any) => (
        <label
          key={opt.value}
          className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm ${
            value === opt.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200"
          }`}
        >
          <span>{opt.label}</span>
          <input
            type="radio"
            name="ordenar"
            className="hidden"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
        </label>
      ))}
    </div>
  );
}

export function Chip({ children, onClear }: any) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs">
      {children}
      <button onClick={onClear} className="rounded-full p-0.5 hover:bg-zinc-200">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
