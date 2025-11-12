import { useEffect, useState } from "react";
import {
  Send,
  Paperclip,
  Trash2,
  Circle,
  FileText,
  DollarSign,
  Landmark,
  Building2,
  Edit2,
  Check,
  ArrowLeft,
  MessageSquare,
  Users,
  Zap,
  LifeBuoy,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

type ChatSessao = {
  id: string;
  profissional_id: string;
  titulo: string;
  status: "ativo" | "inativo";
  criado_em: string;
  ultima_mensagem?: string | null;
  // campo calculado
  statusLabel?: "Ativa" | "Inativa";
};

type Mensagem = {
  id: string;
  sessao_id: string;
  remetente_id: string | null;
  conteudo: string;
  tipo: "texto";
  criado_em: string;
};

export default function ChatComEquipa() {
  const { user } = useAuth();

  const [isMobile, setIsMobile] = useState(false);
  const [abaMobile, setAbaMobile] = useState<"chats" | "equipa" | "rapidas" | "chat">("chats");

  const [chats, setChats] = useState<ChatSessao[]>([]);
  const [chatSelecionado, setChatSelecionado] = useState<ChatSessao | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");

  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloTemp, setTituloTemp] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [chatParaApagar, setChatParaApagar] = useState<string | null>(null);

  // ---- Dados laterais (empresa) ----
  const agentes = [
    { nome: "Débora", cargo: "RH", online: true },
    { nome: "Francisco", cargo: "Obras", online: true },
    { nome: "Paulo", cargo: "Financeiro", online: false },
  ];

  const respostas = [
    {
      titulo: "Documentação obrigatória",
      respostaAutomatica:
        "Para iniciar em obra é obrigatório enviar: ficha médica, cartão de cidadão e comprovativo de morada.",
      icon: <FileText className="w-4 h-4 text-blue-500" />,
    },
    {
      titulo: "Pagamentos",
      respostaAutomatica:
        "Os pagamentos são efetuados semanalmente, mediante conferência de presença com a equipa de RH.",
      icon: <DollarSign className="w-4 h-4 text-yellow-500" />,
    },
    {
      titulo: "Certidão de Segurança Social",
      respostaAutomatica:
        "A certidão pode ser emitida no portal da Segurança Social Direta, com NISS e palavra-passe.",
      icon: <Landmark className="w-4 h-4 text-gray-500" />,
    },
    {
      titulo: "Equipa e obras",
      respostaAutomatica:
        "Temos equipas ativas em Lisboa, Porto e Braga. Fale com o suporte para detalhes e alocação.",
      icon: <Building2 className="w-4 h-4 text-red-500" />,
    },
  ];

  // --------- Responsividade ---------
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --------- Carregar conversas ---------
  useEffect(() => {
    if (user) carregarConversas();
  }, [user]);

  const carregarConversas = async () => {
    if (!user) return;

    const { data: sessoes, error } = await supabase
      .from("chat_sessoes")
      .select("*")
      .eq("profissional_id", user.id)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar sessões:", error);
      return;
    }

    const enriquecidas = await Promise.all(
      (sessoes || []).map(async (chat: ChatSessao) => {
        const { data: ultimaMsg } = await supabase
          .from("chat_mensagens")
          .select("criado_em, conteudo")
          .eq("sessao_id", chat.id)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        let statusLabel: "Ativa" | "Inativa" = "Inativa";
        let ultima_mensagem: string | null = null;

        if (ultimaMsg) {
          const diffHoras =
            (Date.now() - new Date(ultimaMsg.criado_em).getTime()) / (1000 * 60 * 60);
          statusLabel = diffHoras < 24 ? "Ativa" : "Inativa";
          ultima_mensagem = ultimaMsg.conteudo ?? null;
        }

        return { ...chat, statusLabel, ultima_mensagem };
      })
    );

    setChats(enriquecidas as ChatSessao[]);
  };

  // --------- Criar conversa ---------
  const criarChat = async (titulo?: string) => {
    if (!user) return;
    const tituloChat = titulo || "Nova conversa";

    const { data: existente } = await supabase
      .from("chat_sessoes")
      .select("*")
      .eq("profissional_id", user.id)
      .eq("titulo", tituloChat)
      .maybeSingle();

    if (existente) {
      setChatSelecionado(existente as ChatSessao);
      setTituloTemp((existente as ChatSessao).titulo);
      if (isMobile) setAbaMobile("chat");
      return;
    }

    const { data, error } = await supabase
      .from("chat_sessoes")
      .insert([{ profissional_id: user.id, titulo: tituloChat, status: "ativo" }])
      .select()
      .single();

    if (!error && data) {
      setChats((prev) => [data as ChatSessao, ...prev]);
      setChatSelecionado(data as ChatSessao);
      setTituloTemp((data as ChatSessao).titulo);
      if (isMobile) setAbaMobile("chat");
    }
  };

  // --------- Salvar título ---------
  const salvarTitulo = async () => {
    if (!chatSelecionado || !tituloTemp.trim()) return;
    await supabase.from("chat_sessoes").update({ titulo: tituloTemp }).eq("id", chatSelecionado.id);
    setChats((prev) => prev.map((c) => (c.id === chatSelecionado.id ? { ...c, titulo: tituloTemp } : c)));
    setChatSelecionado({ ...chatSelecionado, titulo: tituloTemp });
    setEditandoTitulo(false);
  };

  // --------- Enviar / rápidas ---------
  const enviarMensagem = async (conteudoCustom?: string) => {
    const conteudo = (conteudoCustom ?? novaMensagem).trim();
    if (!conteudo || !chatSelecionado) return;

    const { error } = await supabase.from("chat_mensagens").insert([
      {
        sessao_id: chatSelecionado.id,
        remetente_id: user?.id ?? null,
        conteudo,
        tipo: "texto",
      },
    ]);

    if (!error) setNovaMensagem("");
  };

  const enviarPerguntaRapida = async (r: { titulo: string; respostaAutomatica: string }) => {
    if (!chatSelecionado) {
      await criarChat("Suporte Acrobatas");
    }
    const alvo = chatSelecionado ?? null;
    // garante chat selecionado
    const ensure = async () => {
      if (alvo) return alvo;
      const { data } = await supabase
        .from("chat_sessoes")
        .select("*")
        .eq("profissional_id", user!.id)
        .eq("titulo", "Suporte Acrobatas")
        .maybeSingle();
      return data as ChatSessao;
    };
    const sess = await ensure();
    setChatSelecionado(sess);
    if (isMobile) setAbaMobile("chat");

    await enviarMensagem(r.titulo);
    setTimeout(async () => {
      await supabase.from("chat_mensagens").insert([
        {
          sessao_id: sess.id,
          remetente_id: null,
          conteudo: r.respostaAutomatica,
          tipo: "texto",
        },
      ]);
    }, 500);
  };

  // --------- Realtime + histórico ---------
  useEffect(() => {
    if (!chatSelecionado) return;

    const canal = supabase
      .channel(`mensagens-${chatSelecionado.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        (payload) => {
          const nova = payload.new as Mensagem;
          if (nova.sessao_id === chatSelecionado.id) {
            setMensagens((prev) => [...prev, nova]);
          }
        }
      )
      .subscribe();

    const carregar = async () => {
      const { data } = await supabase
        .from("chat_mensagens")
        .select("*")
        .eq("sessao_id", chatSelecionado.id)
        .order("criado_em", { ascending: true });

      setMensagens((data as Mensagem[]) || []);
    };
    carregar();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [chatSelecionado]);

  // --------- Apagar ---------
  const confirmarApagarChat = (id: string) => {
    setChatParaApagar(id);
    setMostrarModal(true);
  };

  const apagarChat = async () => {
    if (!chatParaApagar) return;
    await supabase.from("chat_mensagens").delete().eq("sessao_id", chatParaApagar);
    await supabase.from("chat_sessoes").delete().eq("id", chatParaApagar);
    setChats((prev) => prev.filter((c) => c.id !== chatParaApagar));
    if (chatSelecionado?.id === chatParaApagar) setChatSelecionado(null);
    setMostrarModal(false);
    setChatParaApagar(null);
  };

  // ===================== MOBILE =====================
  if (isMobile) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col">
        {/* Abas (header) — escondidas enquanto estiver dentro do chat */}
        {abaMobile !== "chat" && (
          <div className="sticky top-0 z-30 flex bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setAbaMobile("chats")}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                abaMobile === "chats" ? "text-blue-600 dark:text-cyan-400 border-b-2 border-blue-500" : "text-slate-500"
              }`}
            >
              <MessageSquare className="w-5 h-5" /> Conversas
            </button>
            <button
              onClick={() => setAbaMobile("equipa")}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                abaMobile === "equipa" ? "text-blue-600 dark:text-cyan-400 border-b-2 border-blue-500" : "text-slate-500"
              }`}
            >
              <Users className="w-5 h-5" /> Equipa
            </button>
            <button
              onClick={() => setAbaMobile("rapidas")}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                abaMobile === "rapidas" ? "text-blue-600 dark:text-cyan-400 border-b-2 border-blue-500" : "text-slate-500"
              }`}
            >
              <Zap className="w-5 h-5" /> Rápidas
            </button>
          </div>
        )}

        {/* LISTA DE CONVERSAS */}
        {abaMobile === "chats" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">💬 Suas conversas</h2>
              <button
                onClick={() => criarChat()}
                className="px-3 py-1.5 rounded-lg text-white bg-blue-600 active:scale-[.98]"
              >
                + Novo
              </button>
            </div>

            {chats.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-10">Nenhum chat ainda.</div>
            )}

            {chats.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setChatSelecionado(c);
                  setAbaMobile("chat");
                }}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  chatSelecionado?.id === c.id
                    ? "bg-blue-50 dark:bg-slate-800 border-blue-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.titulo}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {c.ultima_mensagem || "Sem mensagens ainda"}
                  </p>
                  <span className={`text-[11px] ${c.statusLabel === "Ativa" ? "text-green-500" : "text-slate-400"}`}>
                    {c.statusLabel === "Ativa" ? "🟢 Ativa" : "⚪ Inativa"}
                  </span>
                </div>
                <Trash2
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmarApagarChat(c.id);
                  }}
                  className="w-4 h-4 text-slate-400 hover:text-red-500 shrink-0"
                />
              </div>
            ))}
          </div>
        )}

        {/* EQUIPA */}
        {abaMobile === "equipa" && (
          <div className="p-5 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <LifeBuoy className="w-5 h-5" /> Equipa Acrobatas
            </h3>
            {agentes.map((a, i) => (
              <button
                key={i}
                onClick={() => criarChat(`Suporte — ${a.nome}`)}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="text-sm">👤 {a.nome} — {a.cargo}</span>
                <Circle size={10} className={a.online ? "text-green-500" : "text-slate-400"} />
              </button>
            ))}
          </div>
        )}

        {/* RÁPIDAS */}
        {abaMobile === "rapidas" && (
          <div className="p-5 space-y-3">
            <h3 className="font-semibold text-lg">⚡ Perguntas rápidas</h3>
            {respostas.map((r, i) => (
              <button
                key={i}
                onClick={() => enviarPerguntaRapida(r)}
                className="w-full text-left text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-lg flex items-center gap-2"
              >
                {r.icon} {r.titulo}
              </button>
            ))}
          </div>
        )}

        {/* CHAT */}
        {abaMobile === "chat" && chatSelecionado && (
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col flex-1"
          >
            <div className="sticky top-0 z-30 flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <button onClick={() => setAbaMobile("chats")} className="p-1 rounded-md">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              {editandoTitulo ? (
                <div className="flex items-center gap-2 flex-1 mx-2">
                  <input
                    value={tituloTemp}
                    onChange={(e) => setTituloTemp(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button onClick={salvarTitulo} className="text-green-600">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <h3
                  className="font-semibold text-sm truncate flex-1 mx-2"
                  onDoubleClick={() => {
                    setTituloTemp(chatSelecionado.titulo);
                    setEditandoTitulo(true);
                  }}
                >
                  {chatSelecionado.titulo}
                </h3>
              )}
              <button onClick={() => setChatSelecionado(null)} className="text-xs text-red-500">
                Encerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.remetente_id === user?.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                      m.remetente_id === user?.id
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {m.conteudo}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-slate-400" />
              <input
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                placeholder="Escreva uma mensagem..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
              <button
                onClick={() => enviarMensagem()}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-1"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 text-center max-w-sm w-full border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-2">Apagar conversa?</h3>
              <p className="text-sm text-slate-500 mb-4">Esta ação não poderá ser desfeita.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setMostrarModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600">
                  Cancelar
                </button>
                <button onClick={apagarChat} className="px-4 py-2 rounded-lg bg-red-600 text-white">
                  Apagar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== DESKTOP =====================
  return (
    <div className="min-h-screen w-full px-6 py-8 bg-transparent flex justify-center">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 w-full max-w-7xl">
        {/* Conversas (esquerda) */}
        <div className="col-span-1 bg-white dark:bg-[#111827]/90 rounded-2xl border border-gray-200 dark:border-[#1e293b]/70 shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-4 border-b dark:border-[#1e293b]/70">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200">💬 Suas conversas</h2>
            <button onClick={() => criarChat()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm">
              + Novo
            </button>
          </div>

          <div className="p-3">
            <input
              type="text"
              placeholder="Procurar conversa..."
              className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#0f172a]/70 text-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {chats.length === 0 ? (
              <p className="text-center text-gray-400 mt-10 text-sm">Nenhum chat ainda.</p>
            ) : (
              chats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setChatSelecionado(c)}
                  className={`p-3 rounded-lg cursor-pointer flex justify-between items-center border transition ${
                    chatSelecionado?.id === c.id
                      ? "bg-blue-50 dark:bg-[#1e293b] border-blue-400"
                      : "hover:bg-gray-50 dark:hover:bg-[#1e2536] border-transparent"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-700 dark:text-gray-100 truncate">{c.titulo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.ultima_mensagem || "Sem mensagens ainda"}</p>
                    <span className={`text-[11px] ${c.statusLabel === "Ativa" ? "text-green-500" : "text-gray-400"}`}>
                      {c.statusLabel === "Ativa" ? "🟢 Ativa" : "⚪ Inativa"}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmarApagarChat(c.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat (centro) */}
        <div className="col-span-3 bg-white dark:bg-[#111827]/90 rounded-2xl border border-gray-200 dark:border-[#1e293b]/70 shadow-sm flex flex-col">
          {chatSelecionado ? (
            <>
              <div className="p-4 border-b dark:border-[#1e293b]/70 flex justify-between items-center">
                {editandoTitulo ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      value={tituloTemp}
                      onChange={(e) => setTituloTemp(e.target.value)}
                      className="border rounded-md px-2 py-1 flex-1 outline-none text-sm bg-white dark:bg-[#0f172a]/70 text-gray-800 dark:text-gray-200"
                    />
                    <button onClick={salvarTitulo} className="text-green-600 hover:text-green-700">
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                      {chatSelecionado.titulo}
                      <Edit2
                        size={14}
                        className="text-gray-400 hover:text-blue-500 cursor-pointer"
                        onClick={() => {
                          setEditandoTitulo(true);
                          setTituloTemp(chatSelecionado.titulo);
                        }}
                      />
                    </h3>
                    <button onClick={() => setChatSelecionado(null)} className="text-sm text-gray-400 hover:text-red-500">
                      ✖ Encerrar
                    </button>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {mensagens.length === 0 ? (
                  <p className="text-center text-gray-400">Nenhuma mensagem ainda. Comece a conversar!</p>
                ) : (
                  mensagens.map((m) => (
                    <div key={m.id} className={`flex ${m.remetente_id === user?.id ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-[70%] text-sm ${
                          m.remetente_id === user?.id
                            ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-none"
                            : "bg-gray-200 dark:bg-[#1e293b] dark:text-gray-100 rounded-bl-none"
                        }`}
                      >
                        {m.conteudo}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t bg-white dark:bg-[#0f172a]/80 flex items-center gap-3">
                <Paperclip className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Escreva uma mensagem..."
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                  className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#1e293b]/70 text-sm"
                />
                <button onClick={() => enviarMensagem()} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Send className="w-4 h-4" /> Enviar
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecione um chat à esquerda ou crie um novo.
            </div>
          )}
        </div>

        {/* Suporte (direita) */}
        <div className="col-span-1 bg-white dark:bg-[#111827]/90 rounded-2xl border border-gray-200 dark:border-[#1e293b]/70 shadow-sm flex flex-col">
          <div className="p-5 border-b dark:border-[#1e293b]/70">
            <h3 className="font-semibold text-gray-700 dark:text-gray-100 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5" /> Equipa Acrobatas
            </h3>
            <p className="text-xs text-gray-400 mt-1">Tire dúvidas com o suporte ou gestão.</p>
          </div>

          <div className="p-5 border-b dark:border-[#1e293b]/70">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Agentes online</h4>
            {agentes.map((a, i) => (
              <button
                key={i}
                onClick={() => criarChat(`Suporte — ${a.nome}`)}
                className="flex items-center justify-between w-full mb-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-[#1e2536]"
              >
                <span className="text-sm text-gray-700 dark:text-gray-200">👤 {a.nome} — {a.cargo}</span>
                <Circle size={10} className={a.online ? "text-green-500" : "text-gray-400"} />
              </button>
            ))}
          </div>

          <div className="flex-1 p-5 space-y-3 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Perguntas rápidas</h4>
            {respostas.map((r, i) => (
              <button
                key={i}
                onClick={() => enviarPerguntaRapida(r)}
                className="w-full text-left text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#1e293b]/60 hover:bg-gray-100 dark:hover:bg-[#1e2536] px-4 py-3 rounded-xl border border-gray-200 dark:border-[#1e293b] flex items-center gap-2"
              >
                {r.icon} {r.titulo}
              </button>
            ))}
          </div>

          <div className="p-4 border-t dark:border-[#1e293b]/70 text-xs text-gray-500 dark:text-gray-400 text-center">
            © {new Date().getFullYear()} Acrobatas — Suporte interno
          </div>
        </div>
      </div>

      {/* Modal apagar */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#111827]/95 rounded-2xl p-6 shadow-2xl text-center max-w-sm w-full border border-gray-200 dark:border-[#1e293b]/70">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Apagar conversa?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Esta ação não poderá ser desfeita.</p>
            <div className="flex justify-center gap-3 mt-5">
              <button onClick={() => setMostrarModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-[#1e2536] text-gray-700 dark:text-gray-300 text-sm">
                Cancelar
              </button>
              <button onClick={apagarChat} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm shadow">
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

