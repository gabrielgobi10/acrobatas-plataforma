import { useState, useMemo } from "react";
import { MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cidadesPortugal } from "../../../../data/cidadesPortugal";

// 🔤 Normaliza texto para busca (remove acentos e símbolos)
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function CampoLocal({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [focused, setFocused] = useState(false);

  // Delay de digitação
  const [debounced, setDebounced] = useState(inputValue);
  useMemo(() => {
    const timeout = setTimeout(() => setDebounced(inputValue), 200);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  // 🔎 Filtro de cidades com prioridade inteligente
  const lista = useMemo(() => {
    const q = normalize(debounced);
    if (!q) return [];

    // Remove duplicadas e espaços
    const cidadesUnicas = [...new Set(cidadesPortugal.map((c) => c.trim()))];

    // Cria pontuação de relevância
    const scored = cidadesUnicas.map((c) => {
      const n = normalize(c);
      let score = 999;

      if (n === q) score = 0; // igual
      else if (n.startsWith(q)) score = 1; // começa com
      else if (n.includes(q)) score = 2; // contém
      else score = 3; // irrelevante

      return { cidade: c, score };
    });

    // Ordena por relevância
    return scored
      .filter((x) => x.score < 3)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.cidade.localeCompare(b.cidade, "pt", { sensitivity: "base" });
      })
      .slice(0, 30)
      .map((x) => x.cidade);
  }, [debounced]);

  return (
    <div className="relative w-full">
      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white bg-gray-100 focus-within:border-blue-500 transition-all">
        <MapPin className="w-4 h-4 text-blue-500 mr-2" />
        <input
          type="text"
          className="flex-1 outline-none bg-transparent text-gray-700 placeholder-gray-400"
          placeholder="Digite ou selecione o local da obra"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </div>

      <AnimatePresence>
        {focused && lista.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-10 w-full mt-1 max-h-56 overflow-y-auto bg-white bg-white border border-gray-200 border-gray-200 rounded-lg shadow-lg"
          >
            {lista.map((cidade, i) => (
              <li
                key={i}
                onMouseDown={() => {
                  onChange(cidade);
                  setInputValue(cidade);
                  setFocused(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <MapPin className="w-4 h-4 text-blue-500" />
                <span>{cidade}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

