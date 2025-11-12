import { motion } from "framer-motion";
import { Loader2, Calendar, Medal, X, Check } from "lucide-react";

type Profissional = {
  id: string;
  nome: string;
  funcao: string;
};

type Obra = {
  id: string;
  nome: string;
  cidade?: string | null;
};

type Props = {
  open: boolean;
  prof: Profissional;
  obras: Obra[];
  obraSel: string;
  setObraSel: (v: string) => void;
  dataInicio: string;
  setDataInicio: (v: string) => void;
  valorHora: string;
  setValorHora: (v: string) => void;
  inserindo: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ProfissionalModal({
  open,
  prof,
  obras,
  obraSel,
  setObraSel,
  dataInicio,
  setDataInicio,
  valorHora,
  setValorHora,
  inserindo,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl bg-white bg-gray-100 p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h4 className="text-lg font-semibold">Adicionar à obra</h4>
            <p className="text-sm text-zinc-600">
              {prof.nome} — {prof.funcao}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              Obra
            </span>
            <select
              value={obraSel}
              onChange={(e) => setObraSel(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">Selecione uma obra…</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome} {o.cidade ? `— ${o.cidade}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-zinc-600">
                Data de início
              </span>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-zinc-600">
                Valor hora (€)
              </span>
              <div className="relative">
                <Medal className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  inputMode="decimal"
                  value={valorHora}
                  onChange={(e) => setValorHora(e.target.value)}
                  placeholder="ex: 14.50"
                  className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            disabled={!obraSel || inserindo}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {inserindo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

