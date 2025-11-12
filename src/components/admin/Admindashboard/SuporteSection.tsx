import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  HelpCircle,
  MessageSquare,
  Send,
  Mail,
  Phone,
  MapPin,
  Star,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function SuporteSection() {
  const [tipoSelecionado, setTipoSelecionado] = useState("empresa");
  const [statusSelecionado, setStatusSelecionado] = useState("abertos");
  const [conversaSelecionada, setConversaSelecionada] = useState<any>(null);
  const [dadosContato, setDadosContato] = useState<any>(null);
  const [mensagem, setMensagem] = useState("");
  const [conversas, setConversas] = useState<any>({
    empresa: [],
    profissional: [],
    publico: [],
  });
  const [mensagens, setMensagens] = useState<any[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  // ================= CARREGAR CONVERSAS =================
  useEffect(() => {
    carregarConversas();

    const canal = supabase
      .channel("realtime-suporte")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        () => carregarConversas()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const carregarConversas = async () => {
    const { data: sessoes, error } = await supabase
      .from("chat_sessoes")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("❌ Erro ao carregar conversas:", error);
      return;
    }

    // Filtra apenas sessões com mensagens
    const { data: mensagens } = await supabase
      .from("chat_mensagens")
      .select("sessao_id");

    const sessoesComMensagens = sessoes.filter((s) =>
      mensagens?.some((m) => m.sessao_id === s.id)
    );

    const empresas = sessoesComMensagens.filter((d) => d.empresa_id);
    const profissionais = sessoesComMensagens.filter((d) => d.profissional_id);
    const publicos = sessoesComMensagens.filter(
      (d) => !d.empresa_id && !d.profissional_id
    );

    setConversas({
      empresa: empresas,
      profissional: profissionais,
      publico: publicos,
    });
  };

  const listaAtual = conversas[tipoSelecionado] || [];

  // ================= CARREGAR MENSAGENS =================
  useEffect(() => {
    if (!conversaSelecionada) return;

    const carregarMensagens = async () => {
      const { data, error } = await supabase
        .from("chat_mensagens")
        .select("*")
        .eq("sessao_id", conversaSelecionada.id)
        .order("criado_em", { ascending: true });

      if (error) console.error("❌ Erro ao carregar mensagens:", error);
      setMensagens(data || []);
      setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
    };

    carregarMensagens();

    // Realtime
    const canal = supabase
      .channel(`mensagens-${conversaSelecionada.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        (payload) => {
          if (payload.new.sessao_id === conversaSelecionada.id) {
            setMensagens((prev) => [...prev, payload.new]);
            setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [conversaSelecionada]);

  // ================= CARREGAR DETALHES DO CONTATO =================
  useEffect(() => {
    const carregarContato = async () => {
      if (!conversaSelecionada) return;
      let usuarioId = null;
      let tipoUsuario = "";

      if (conversaSelecionada.empresa_id) {
        usuarioId = conversaSelecionada.empresa_id;
        tipoUsuario = "empresa";
      } else if (conversaSelecionada.profissional_id) {
        usuarioId = conversaSelecionada.profissional_id;
        tipoUsuario = "profissional";
      }

      if (!usuarioId) {
        setDadosContato(null);
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("nome, email, telefone, cidade, morada")
       .or(`id.eq.${usuarioId},email.eq.${usuarioId}`)
        .single();

      if (error) {
        console.error("❌ Erro ao buscar detalhes do contato:", error);
        setDadosContato(null);
      } else {
        setDadosContato(data);
      }
    };

    carregarContato();
  }, [conversaSelecionada]);

  // ================= ENVIAR MENSAGEM =================
  const enviarMensagem = async () => {
    if (!mensagem.trim() || !conversaSelecionada) return;

    const { error } = await supabase.from("chat_mensagens").insert([
      {
        sessao_id: conversaSelecionada.id,
        remetente_id: "admin",
        conteudo: mensagem.trim(),
        tipo: "texto",
        criado_em: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      alert("Erro ao enviar mensagem");
    } else {
      setMensagem("");
      setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
    }
  };

  // ================= FILTRO =================
  const filtrarPorStatus = (lista: any[]) => {
    const ordenado = [...lista].sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );
    switch (statusSelecionado) {
      case "abertos":
        return ordenado.filter((c) => c.status === "ativo" || c.status === "Aberto");
      case "andamento":
        return ordenado.filter((c) => c.status === "Em andamento");
      case "fechados":
        return ordenado.filter((c) => c.status === "Fechado" || c.status === "inativo");
      default:
        return ordenado;
    }
  };

  // ================= INTERFACE =================
  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#f4f7fb] p-6 rounded-3xl flex flex-col gap-5">
      {/* TOPO */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { key: "empresa", label: "Empresas", icon: Building2, cor: "blue" },
          { key: "profissional", label: "Profissionais", icon: Users, cor: "green" },
          { key: "publico", label: "Público", icon: HelpCircle, cor: "purple" },
        ].map((item) => (
          <motion.div
            key={item.key}
            whileHover={{ y: -3, scale: 1.02 }}
            onClick={() => {
              setTipoSelecionado(item.key);
              setConversaSelecionada(null);
              setDadosContato(null);
            }}
            className={`cursor-pointer rounded-2xl p-5 flex items-center gap-3 border shadow-md transition ${
              tipoSelecionado === item.key
                ? `bg-gradient-to-br from-${item.cor}-50 to-${item.cor}-100 border-${item.cor}-400`
                : "bg-white bg-gray-100 border-gray-200 border-gray-200 hover:bg-gray-50 bg-gray-50"
            }`}
          >
            <item.icon
              className={`w-7 h-7 ${
                tipoSelecionado === item.key
                  ? `text-${item.cor}-600`
                  : "text-gray-400"
              }`}
            />
            <div>
              <p className="font-semibold text-gray-700 text-lg">{item.label}</p>
              <p className="text-xs text-gray-500 text-gray-500">Mensagens e tickets</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CORPO */}
      <div className="flex flex-1 gap-5">
        {/* ===== LISTA ===== */}
        <div className="w-1/4 bg-white bg-white rounded-2xl shadow-sm border border-gray-100 border-gray-100 flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" /> Conversas
            </h2>
          </div>

          <div className="flex justify-around text-sm font-medium border-b bg-gray-50 bg-white">
            {[
              { key: "abertos", label: "Abertos" },
              { key: "andamento", label: "Andamento" },
              { key: "fechados", label: "Fechados" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusSelecionado(f.key)}
                className={`px-3 py-2 ${
                  statusSelecionado === f.key
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 text-gray-600 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {filtrarPorStatus(listaAtual).map((c) => (
              <motion.div
                key={c.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setConversaSelecionada(c)}
                className={`p-3 mb-2 rounded-xl cursor-pointer border ${
                  conversaSelecionada?.id === c.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-100 border-gray-200 hover:bg-gray-50 dark:bg-zinc-950"
                }`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">
                    {c.titulo || "Nova conversa"}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === "ativo"
                        ? "bg-green-100 text-green-600"
                        : c.status === "Em andamento"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {c.status || "Ativo"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(c.criado_em).toLocaleString("pt-PT")}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ===== CHAT ===== */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col">
          {conversaSelecionada ? (
            <>
              <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-zinc-950">
                <div>
                  <h2 className="font-semibold text-gray-700">
                    {conversaSelecionada.titulo}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {conversaSelecionada.empresa_id
                      ? "Empresa"
                      : conversaSelecionada.profissional_id
                      ? "Profissional"
                      : "Público"}
                  </p>
                </div>
              </div>

              <div
                ref={chatRef}
                className="flex-1 p-5 overflow-y-auto bg-gray-50 dark:bg-zinc-950 space-y-3"
              >
                {mensagens.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${
                      m.remetente_id === "admin"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-xs shadow ${
                        m.remetente_id === "admin"
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none"
                          : "bg-white dark:bg-zinc-900 text-gray-700 border rounded-bl-none"
                      }`}
                    >
                      {m.conteudo}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-3 border-t bg-white dark:bg-zinc-900 flex items-center gap-2">
                <input
                  type="text"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                  placeholder="Escreva uma resposta..."
                  className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={enviarMensagem}
                  className="bg-blue-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <Send className="w-4 h-4" /> Enviar
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 justify-center items-center text-gray-400 text-sm">
              Selecione uma conversa à esquerda.
            </div>
          )}
        </div>

        {/* ===== DETALHES ===== */}
        <div className="w-1/4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col">
          {conversaSelecionada ? (
            <div className="p-5">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" /> Detalhes
              </h3>

              {dadosContato ? (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline text-gray-400 mr-2" />
                    {dadosContato.email || "—"}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline text-gray-400 mr-2" />
                    {dadosContato.telefone || "—"}
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    <MapPin className="w-4 h-4 inline text-gray-400 mr-2" />
                    {dadosContato.morada ||
                      dadosContato.cidade ||
                      "—"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  Nenhum detalhe disponível
                </p>
              )}

              <h4 className="font-semibold text-gray-600 text-gray-600 mt-5 mb-2">Prioridade</h4>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    className={`w-5 h-5 ${
                      n <= (conversaSelecionada.prioridade || 1)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Criado em:{" "}
                <span className="font-medium text-gray-700">
                  {new Date(conversaSelecionada.criado_em).toLocaleString("pt-PT")}
                </span>
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Nenhum contato selecionado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
