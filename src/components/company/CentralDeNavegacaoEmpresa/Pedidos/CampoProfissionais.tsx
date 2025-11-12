import { useState, useEffect, useMemo, useRef } from "react";
import { Briefcase, Search, XCircle } from "lucide-react";

export default function CampoProfissionais({
  tipo,
  experiencia,
  quantidade,
  onChange,
}: {
  tipo: string;
  experiencia: string;
  quantidade: number;
  onChange: (values: {
    tipo: string;
    experiencia: string;
    quantidade: number;
  }) => void;
}) {
  const [input, setInput] = useState(tipo ?? "");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [debounced, setDebounced] = useState(input);
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const tipos = [
    "Canalizador", "Eletricista", "Pedreiro", "Pintor", "Servente",
    "Carpinteiro", "Serralheiro", "Soldador", "Armador de Ferro", "Estucador",
    "Aplicador de Pladur", "Gessador", "Aplicador de Capoto (ETICS)",
    "Montador de Andaimes", "Encarregado de Obra", "Técnico de Segurança",
    "Topógrafo", "Condutor de Obra", "Jardineiro", "Aplicador de Cerâmica",
  ];

  const experiencias = [
    "Menos de 1 ano",
    "1–3 anos",
    "3–5 anos",
    "Mais de 5 anos",
  ];

  // normalizar texto para busca
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 120);
    return () => clearTimeout(t);
  }, [input]);

  // fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClick = (e: any) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // filtrar resultados
  const listaFiltrada = useMemo(() => {
    const q = normalize(debounced);
    if (!q) return tipos;
    return tipos
      .filter((t) => normalize(t).includes(q))
      .sort((a, b) => a.localeCompare(b));
  }, [debounced]);

  // selecionar opção
  const selecionar = (valor: string) => {
    setInput(valor);
    setOpen(false);
    setHighlightIndex(-1);
    onChange({ tipo: valor, experiencia, quantidade });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1 >= listaFiltrada.length ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) =>
        i - 1 < 0 ? listaFiltrada.length - 1 : i - 1
      );
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      selecionar(listaFiltrada[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const limpar = () => {
    setInput("");
    onChange({ tipo: "", experiencia, quantidade });
  };

  return (
    <div className="mt-8" ref={rootRef}>
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="text-blue-500 w-5 h-5" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Profissionais
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tipo com busca */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#1f2a37]
                          bg-white dark:bg-[#1e2a3a] pl-3 pr-2 py-2 
                          focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <Search size={16} className="text-gray-400" />
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setOpen(true);
              }}
              onKeyDown={onKeyDown}
              placeholder="Pesquisar profissão..."
              className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-100"
            />
            {input && (
              <button
                onClick={limpar}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>

          {open && (
            <div
              ref={listRef}
              className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-lg border 
                         border-gray-200 dark:border-[#1f2a37] bg-white dark:bg-[#1e2a3a] 
                         shadow-lg transition-all"
            >
              {listaFiltrada.length > 0 ? (
                listaFiltrada.map((t, idx) => (
                  <button
                    key={t}
                    onClick={() => selecionar(t)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`w-full text-left px-3 py-2 text-sm transition ${
                      highlightIndex === idx
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                        : "hover:bg-gray-50 dark:hover:bg-[#222d3b] text-gray-700 dark:text-gray-100"
                    }`}
                  >
                    {t}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Nenhum resultado encontrado.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Experiência */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Experiência
          </label>
          <select
            className="w-full border border-gray-200 dark:border-[#1f2a37] rounded-xl px-3 py-2 
                       bg-white dark:bg-[#1e2a3a] text-gray-700 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={experiencia}
            onChange={(e) =>
              onChange({ tipo: input, experiencia: e.target.value, quantidade })
            }
          >
            {experiencias.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        {/* Quantidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quantidade
          </label>
          <input
            type="number"
            min={1}
            className="w-full border border-gray-200 dark:border-[#1f2a37] rounded-xl px-3 py-2 
                       bg-white dark:bg-[#1e2a3a] text-gray-700 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={quantidade}
            onChange={(e) =>
              onChange({
                tipo: input,
                experiencia,
                quantidade: Number(e.target.value),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
