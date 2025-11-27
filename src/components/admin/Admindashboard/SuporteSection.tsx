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
  const [tipoSelecionado, setTipoSelecionado] = useState<"empresa" | "profissional" | "publico">("empresa");
  const [statusSelecionado, setStatusSelecionado] = useState<"abertos" | "andamento" | "fechados">("abertos");
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

    const { data: mensagens } = await supabase
      .from("chat_mensagens")
      .select("sessao_id");

    const sessoesComMensagens = (sessoes || []).filter((s) =>
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
      setTimeout(
        () => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight),
        100
      );
    };

    carregarMensagens();

    const canal = supabase
      .channel(`mensagens-${conversaSelecionada.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        (payload) => {
          if (payload.new.sessao_id === conversaSelecionada.id) {
            setMensagens((prev) => [...prev, payload.new]);
            setTimeout(
              () => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight),
              100
            );
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
      let usuarioId: string | null = null;

      if (conversaSelecionada.empresa_id) {
        usuarioId = conversaSelecionada.empresa_id;
      } else if (conversaSelecionada.profissional_id) {
        usuarioId = conversaSelecionada.profissional_id;
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
      setTimeout(
        () => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight),
        100
      );
    }
  };

  // ================= FILTRO =================
  const filtrarPorStatus = (lista: any[]) => {
    const ordenado = [...lista].sort(
      (a, b) =>
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );
    switch (statusSelecionado) {
      case "abertos":
        return ordenado.filter(
          (c) => c.status === "ativo" || c.status === "Aberto"
        );
      case "andamento":
        return ordenado.filter((c) => c.status === "Em andamento");
      case "fechados":
        return ordenado.filter(
          (c) => c.status === "Fechado" || c.status === "inativo"
        );
      default:
        return ordenado;
    }
  };

  // ================= INTERFACE =================
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Cabeçalho */}
      <div className="rounded-2xl px-4 py-4 sm:px-6 sm:py-5 bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500" />
          Central de Suporte
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie tickets e conversas com empresas, profissionais e público.
        </p>
      </div>

      {/* Tabs de tipo (Empresas / Profissionais / Público) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { key: "empresa", label: "Empresas", icon: Building2, cor: "blue" },
          {
            key: "profissional",
            label: "Profissionais",
            icon: Users,
            cor: "emerald",
          },
          { key: "publico", label: "Público", icon: HelpCircle, cor: "violet" },
        ].map((item) => (
          <motion.button
            key={item.key}
            type="button"
            whileHover={{ y: -2, scale: 1.01 }}
            onClick={() => {
              setTipoSelecionado(item.key as any);
              setConversaSelecionada(null);
              setDadosContato(null);
            }}
            className={`cursor-pointer rounded-2xl px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 border text-left shadow-sm transition
              ${
                tipoSelecionado === item.key
                  ? "bg-slate-900 text-slate-50 border-sky-500"
                  : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800"
              }`}
          >
            <item.icon
              className={`w-6 h-6 ${
                tipoSelecionado === item.key
                  ? "text-sky-400"
                  : "text-slate-400"
              }`}
            />
            <div>
              <p className="font-semibold text-sm sm:text-base">
                {item.label}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Mensagens e tickets
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Corpo – responsivo: coluna no mobile, 3 colunas no desktop */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
        {/* ===== LISTA ===== */}
        <div className="w-full lg:w-1/4 bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
              Conversas
            </h2>
          </div>

          <div className="flex justify-around text-xs sm:text-sm font-medium border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900">
            {[
              { key: "abertos", label: "Abertos" },
              { key: "andamento", label: "Andamento" },
              { key: "fechados", label: "Fechados" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() =>
                  setStatusSelecionado(f.key as "abertos" | "andamento" | "fechados")
                }
                className={`px-2 sm:px-3 py-2 border-b-2 transition-colors ${
                  statusSelecionado === f.key
                    ? "text-sky-600 border-sky-500"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtrarPorStatus(listaAtual).map((c) => (
              <motion.div
                key={c.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setConversaSelecionada(c)}
                className={`p-3 rounded-xl cursor-pointer border text-xs sm:text-sm transition
                  ${
                    conversaSelecionada?.id === c.id
                      ? "border-sky-400 bg-sky-50/60 dark:bg-sky-900/30"
                      : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {c.titulo || "Nova conversa"}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      c.status === "ativo"
                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : c.status === "Em andamento"
                        ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
                        : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
                    }`}
                  >
                    {c.status || "Ativo"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {new Date(c.criado_em).toLocaleString("pt-PT")}
                </p>
              </motion.div>
            ))}

            {filtrarPorStatus(listaAtual).length === 0 && (
              <p className="text-[11px] text-slate-400 text-center mt-4">
                Nenhuma conversa nesse filtro.
              </p>
            )}
          </div>
        </div>

        {/* ===== CHAT ===== */}
        <div className="w-full lg:flex-1 bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[260px]">
          {conversaSelecionada ? (
            <>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    {conversaSelecionada.titulo}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                className="flex-1 p-3 sm:p-4 overflow-y-auto bg-slate-50/80 dark:bg-slate-950 space-y-3"
              >
                {mensagens.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex ${
                      m.remetente_id === "admin"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[75%] text-xs sm:text-sm shadow
                        ${
                          m.remetente_id === "admin"
                            ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white rounded-br-none"
                            : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                        }`}
                    >
                      {m.conteudo}
                    </div>
                  </motion.div>
                ))}

                {mensagens.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center mt-6">
                    Nenhuma mensagem ainda. Envie a primeira resposta.
                  </p>
                )}
              </div>

              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900 flex items-center gap-2">
                <input
                  type="text"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                  placeholder="Escreva uma resposta..."
                  className="flex-1 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500"
                />
                <button
                  onClick={enviarMensagem}
                  className="bg-sky-600 text-white px-4 sm:px-5 py-2 rounded-xl flex items-center gap-2 text-xs sm:text-sm hover:bg-sky-700 transition"
                >
                  <Send className="w-4 h-4" />
                  Enviar
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 justify-center items-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm px-4">
              Selecione uma conversa na lista ao lado.
            </div>
          )}
        </div>

        {/* ===== DETALHES ===== */}
        <div className="w-full lg:w-1/4 bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[220px]">
          {conversaSelecionada ? (
            <div className="p-4 sm:p-5 space-y-3 text-sm">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-500" /> Detalhes do contato
              </h3>

              {dadosContato ? (
                <>
                  <p className="text-slate-700 dark:text-slate-200 flex items-center gap-2 text-xs sm:text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {dadosContato.email || "—"}
                  </p>
                  <p className="text-slate-700 dark:text-slate-200 flex items-center gap-2 text-xs sm:text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {dadosContato.telefone || "—"}
                  </p>
                  <p className="text-slate-700 dark:text-slate-200 flex items-center gap-2 text-xs sm:text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {dadosContato.morada ||
                      dadosContato.cidade ||
                      "—"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  Nenhum detalhe disponível.
                </p>
              )}

              <div className="pt-2">
                <h4 className="font-semibold text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Prioridade
                </h4>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${
                        n <= (conversaSelecionada.prioridade || 1)
                          ? "text-amber-400"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Criado em:{" "}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {new Date(conversaSelecionada.criado_em).toLocaleString(
                    "pt-PT"
                  )}
                </span>
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm px-4">
              Nenhum contato selecionado.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
