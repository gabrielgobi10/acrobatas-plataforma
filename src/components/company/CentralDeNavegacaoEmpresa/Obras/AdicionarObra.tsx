import { motion } from "framer-motion";
import { Building2, Send, Loader2, CheckCircle2, MapPin } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";

// 🧠 Hook debounce
function useDebounce(callback: (...args: any[]) => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  return (...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  };
}

export default function AdicionarObra() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const dadosPedido = location.state || {};

  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState<string | false>(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [form, setForm] = useState({
    nomeObra: "",
    empresa: user?.email || "",
    local: "",
    latitude: "",
    longitude: "",
    dataInicio: "",
    previsaoTermino: "",
    profissionais: "",
    descricao: "",
  });

  // ✅ Pré-preenche se vier de outro módulo (mantendo Nome da Obra livre)
  useEffect(() => {
    if (dadosPedido && Object.keys(dadosPedido).length > 0) {
      setForm({
        nomeObra: "",
        empresa:
          dadosPedido.empresa ||
          dadosPedido.nome_empresa ||
          user?.email ||
          "",
        local: dadosPedido.local || "",
        latitude: dadosPedido.latitude || "",
        longitude: dadosPedido.longitude || "",
        dataInicio: dadosPedido.dataInicio || dadosPedido.data_inicio || "",
        previsaoTermino:
          dadosPedido.previsaoTermino || dadosPedido.data_fim || "",
        profissionais:
          dadosPedido.profissionais || dadosPedido.quantidade?.toString() || "",
        descricao: dadosPedido.descricao || dadosPedido.observacoes || "",
      });
    }
  }, [dadosPedido, user]);

  // Atualiza campos
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  // Busca sugestões via OpenStreetMap
  const buscarSugestoes = useDebounce(async (valor: string) => {
    if (valor.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          valor
        )}&addressdetails=1&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Erro ao buscar sugestões:", err);
    }
  }, 800);

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setForm((prev) => ({ ...prev, local: valor }));
    buscarSugestoes(valor);
  };

  const handleSelectSuggestion = (sugestao: any) => {
    const cidadePrincipal =
      sugestao.display_name.split(",")[0]?.trim() || sugestao.display_name;
    setForm((prev) => ({
      ...prev,
      local: cidadePrincipal,
      latitude: sugestao.lat,
      longitude: sugestao.lon,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    toast.success(`📍 Local selecionado: ${cidadePrincipal}`);
  };

  // ✅ Envia obra ao Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.nomeObra.trim() ||
      !form.empresa ||
      !form.local ||
      !form.dataInicio ||
      !form.previsaoTermino ||
      !form.profissionais
    ) {
      toast.error("Preencha todos os campos obrigatórios, incluindo o nome da obra!");
      return;
    }

    try {
      setLoading(true);
      console.log("🚀 Enviando obra para Supabase...");

      // 1️⃣ Buscar empresa_id a partir da tabela pedidos_empresa_v2
      const { data: empresas, error: empErr } = await supabase
        .from("pedidos_empresa_v2")
        .select("id_empresa")
        .eq("nome_empresa", user.email);

      if (empErr) throw empErr;
      if (!empresas || empresas.length === 0) {
        toast.error("Empresa não encontrada para este usuário!");
        setLoading(false);
        return;
      }

      const empresaId = empresas[0].id_empresa;
      console.log("🏢 Empresa ID encontrada:", empresaId);

      // 2️⃣ Inserir nova obra
      const { data, error } = await supabase
        .from("obras")
        .insert([
          {
            nome: form.nomeObra,
            descricao: form.descricao || "",
            endereco: form.local || "",
            cidade: form.local || "",
            pais: "Portugal",
            latitude: form.latitude ? parseFloat(form.latitude) : null,
            longitude: form.longitude ? parseFloat(form.longitude) : null,
            data_inicio: form.dataInicio,
            data_fim: form.previsaoTermino,
            status: "A iniciar",
            progresso_total: 0,
            custo_total: 0,
            horas_trabalhadas_total: 0,
            criado_em: new Date().toISOString(),
            empresa_id: empresaId,
          },
        ])
        .select();

      if (error) {
        console.error("❌ Erro ao salvar obra:", error);
        toast.error("Erro ao salvar obra!");
      } else {
        const novaObraId = data?.[0]?.id;
        console.log("✅ Obra criada com sucesso:", novaObraId);
        toast.success("🏗️ Obra criada com sucesso!");
        setSucesso(novaObraId);
      }
    } catch (e) {
      console.error("Erro inesperado ao criar obra:", e);
      toast.error("Erro inesperado ao criar obra.");
    } finally {
      setLoading(false);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setForm({
      nomeObra: "",
      empresa: user?.email || "",
      local: "",
      latitude: "",
      longitude: "",
      dataInicio: "",
      previsaoTermino: "",
      profissionais: "",
      descricao: "",
    });
    setSucesso(false);
  };

  // Ir para obras ativas
  const irParaObrasAtivas = () => {
    console.log("🔁 Indo para obras-ativas com destaque da nova obra...");
    window.dispatchEvent(
      new CustomEvent("setSection", { detail: "obras-ativas" })
    );

    if (sucesso) {
      navigate(`/empresa?novaObra=${sucesso}`, { replace: true });
    } else {
      navigate("/empresa", { replace: true });
    }
  };

  // ✅ Tela de sucesso
  if (sucesso) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center h-[80vh] text-center p-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-[#0f172a] p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-700 max-w-md w-full"
        >
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            Obra cadastrada com sucesso!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Você pode acompanhar todos os detalhes ou cadastrar uma nova.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={irParaObrasAtivas}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition"
            >
              Ver Minhas Obras
            </button>
            <button
              onClick={resetForm}
              className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-[#162033] text-gray-800 dark:text-gray-200 px-6 py-2.5 rounded-lg"
            >
              Criar Nova Obra
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ✅ Formulário (apenas cores no modo claro ajustadas)
  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      <div className="flex items-center gap-3 mb-8">
        <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Adicionar Obra
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Preencha as informações abaixo para registrar uma nova obra.
          </p>
        </div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-zinc-800 shadow-sm rounded-2xl p-6 space-y-6"
      >
        {/* CAMPOS */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Nome da Obra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome da Obra
            </label>
            <input
              type="text"
              name="nomeObra"
              value={form.nomeObra}
              onChange={handleChange}
              placeholder="Digite o nome da obra..."
              required
              className="w-full bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>

          {/* Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Empresa
            </label>
            <input
              type="text"
              name="empresa"
              value={form.empresa}
              readOnly
              className="w-full bg-gray-100 dark:bg-[#1e293b] text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 cursor-not-allowed"
            />
          </div>

          {/* Localização */}
          <div className="md:col-span-2 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Localização / Cidade
            </label>
            <div className="relative">
              <input
                type="text"
                name="local"
                value={form.local}
                onChange={handleLocalChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Ex: Lisboa, Portugal"
                required
                className="w-full bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
              <MapPin className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-zinc-700 rounded-lg mt-1 w-full shadow-xl max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="block w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#243147] transition"
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datas e Profissionais */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data de Início
            </label>
            <input
              type="date"
              name="dataInicio"
              value={form.dataInicio}
              onChange={handleChange}
              required
              className="w-full bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Previsão de Término
            </label>
            <input
              type="date"
              name="previsaoTermino"
              value={form.previsaoTermino}
              onChange={handleChange}
              required
              className="w-full bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nº de Profissionais
            </label>
            <input
              type="number"
              name="profissionais"
              value={form.profissionais}
              onChange={handleChange}
              required
              className="w-full bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descrição / Observações
          </label>
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            rows={4}
            className="w-full bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            placeholder="Descreva brevemente o tipo de obra..."
          />
        </div>

        {/* Botão */}
        <div className="flex justify-end">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Adicionar Obra
              </>
            )}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}
