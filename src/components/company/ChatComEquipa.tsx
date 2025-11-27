// src/components/company/ChatComEquipa.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useSearchParams } from "react-router-dom";

/* =============================
   Tipos
============================= */
type ChatSessao = {
  id: string;
  profissional_id?: string;
  empresa_id?: string;
  titulo: string;
  status: "ativo" | "inativo";
  criado_em: string;
  ultima_mensagem?: string | null;
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

/* =============================
   Componente
============================= */
export default function ChatComEquipa() {
  const { user } = useAuth();
  const location = useLocation();
  const [search] = useSearchParams();

  const [isMobile, setIsMobile] = useState(false);
  const [abaMobile, setAbaMobile] = useState<"chats" | "equipa" | "rapidas" | "chat">("chats");

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSessao[]>([]);
  const [chatSelecionado, setChatSelecionado] = useState<ChatSessao | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");

  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloTemp, setTituloTemp] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [chatParaApagar, setChatParaApagar] = useState<string | null>(null);

  // refs para UX
  const listaRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
      icon: <FileText className="w-4 h-4" />,
    },
    {
      titulo: "Pagamentos",
      respostaAutomatica:
        "Os pagamentos são efetuados semanalmente, mediante conferência de presença com a equipa de RH.",
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      titulo: "Certidão de Segurança Social",
      respostaAutomatica:
        "A certidão pode ser emitida no portal da Segurança Social Direta, com NISS e palavra-passe.",
      icon: <Landmark className="w-4 h-4" />,
    },
    {
      titulo: "Equipa e obras",
      respostaAutomatica:
        "Temos equipas ativas em Lisboa, Porto e Braga. Fale com o suporte para detalhes e alocação.",
      icon: <Building2 className="w-4 h-4" />,
    },
  ];

  /* ---------------- Responsividade --------------- */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* --------- Pega empresa_id (para chat da EMPRESA) --------- */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data, error } = await supabase.rpc("minha_empresa_id");
      if (!cancelado) setEmpresaId(error ? null : data ?? null);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /* ---------------- Carregar conversas --------------- */
  useEffect(() => {
    if (!user) return;
    carregarConversas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, empresaId]);

  const carregarConversas = async () => {
    if (!user) return;

    let sessoes: any[] | null = null;
    let error: any = null;

    if (empresaId) {
      const q1 = await supabase
        .from("chat_sessoes")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("criado_em", { ascending: false });
      sessoes = q1.data;
      error = q1.error;
    }

    if ((!sessoes || sessoes.length === 0) && !error) {
      const q2 = await supabase
        .from("chat_sessoes")
        .select("*")
        .eq("profissional_id", user.id)
        .order("criado_em", { ascending: false });
      sessoes = q2.data;
      error = q2.error;
    }

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
          ultima_mensagem = (ultimaMsg as any).conteudo ?? null;
        }

        return { ...chat, statusLabel, ultima_mensagem };
      })
    );

    setChats(enriquecidas as ChatSessao[]);
  };

  /* --------- Criar/abrir conversa --------- */
  const criarChat = async (titulo?: string): Promise<ChatSessao | null> => {
    if (!user) return null;
    const tituloChat = titulo || "Nova conversa";

    if (empresaId) {
      const { data: existenteEmp } = await supabase
        .from("chat_sessoes")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("titulo", tituloChat)
        .maybeSingle();
      if (existenteEmp) {
        const s = existenteEmp as ChatSessao;
        setChatSelecionado(s);
        setTituloTemp(s.titulo);
        if (isMobile) setAbaMobile("chat");
        return s;
      }
    }

    const { data: existenteProf } = await supabase
      .from("chat_sessoes")
      .select("*")
      .eq("profissional_id", user.id)
      .eq("titulo", tituloChat)
      .maybeSingle();

    if (existenteProf) {
      const s = existenteProf as ChatSessao;
      setChatSelecionado(s);
      setTituloTemp(s.titulo);
      if (isMobile) setAbaMobile("chat");
      return s;
    }

    let inserido: ChatSessao | null = null;

    if (empresaId) {
      const r1 = await supabase
        .from("chat_sessoes")
        .insert([{ empresa_id: empresaId, titulo: tituloChat, status: "ativo" }])
        .select()
        .single();

      if (!r1.error && r1.data) inserido = r1.data as ChatSessao;
    }

    if (!inserido) {
      const r2 = await supabase
        .from("chat_sessoes")
        .insert([{ profissional_id: user.id, titulo: tituloChat, status: "ativo" }])
        .select()
        .single();

      if (!r2.error && r2.data) inserido = r2.data as ChatSessao;
    }

    if (inserido) {
      setChats((prev) => [inserido!, ...prev]);
      setChatSelecionado(inserido);
      setTituloTemp(inserido.titulo);
      if (isMobile) setAbaMobile("chat");
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    return inserido;
  };

  /* --------- Salvar título --------- */
  const salvarTitulo = async () => {
    if (!chatSelecionado || !tituloTemp.trim()) return;
    await supabase.from("chat_sessoes").update({ titulo: tituloTemp }).eq("id", chatSelecionado.id);
    setChats((prev) => prev.map((c) => (c.id === chatSelecionado.id ? { ...c, titulo: tituloTemp } : c)));
    setChatSelecionado({ ...chatSelecionado, titulo: tituloTemp });
    setEditandoTitulo(false);
  };

  /* --------- Enviar mensagens --------- */
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
    let sess = chatSelecionado;
    if (!sess) sess = await criarChat("Suporte Acrobatas");
    if (!sess) return;

    setChatSelecionado(sess);
    if (isMobile) setAbaMobile("chat");

    await enviarMensagem(r.titulo);
    setTimeout(async () => {
      await supabase.from("chat_mensagens").insert([
        {
          sessao_id: sess!.id,
          remetente_id: null,
          conteudo: r.respostaAutomatica,
          tipo: "texto",
        },
      ]);
    }, 400);
  };

  /* --------- Realtime + histórico --------- */
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

  // autoscroll elegante
  useEffect(() => {
    if (!listaRef.current) return;
    listaRef.current.scrollTo({
      top: listaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mensagens.length]);

  /* --------- Apagar --------- */
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

  /* --------- Deep-link / Auto-abrir chat --------- */
  useEffect(() => {
    const sessaoParam = search.get("sessao");
    if (sessaoParam && chats.length > 0) {
      const s = chats.find((c) => c.id === sessaoParam);
      if (s) {
        setChatSelecionado(s);
        if (isMobile) setAbaMobile("chat");
        return;
      }
    }

    const state = location.state as any;
    if (state?.novoChat) {
      (async () => {
        const s = await criarChat(state.novoChat as string);
        if (s && state.primeiraMensagem) {
          await supabase.from("chat_mensagens").insert([
            {
              sessao_id: s.id,
              remetente_id: user?.id ?? null,
              conteudo: String(state.primeiraMensagem),
              tipo: "texto",
            },
          ]);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, search, chats, isMobile]);

  /* ===================== MOBILE ===================== */
  if (isMobile) {
    return (
      // >>> sem fundo extra: herda do painel
      <div className="min-h-screen bg-transparent flex flex-col">
        {/* SEGMENTED TABS */}
        {abaMobile !== "chat" && (
          // >>> tabs bar transparente (sem véu)
          <div className="sticky top-0 z-30 px-4 pt-3 pb-2 bg-transparent border-b border-slate-200 dark:border-slate-800">
            <div className="relative w-full bg-slate-100 dark:bg-slate-800 rounded-full p-1 flex">
              {["chats", "equipa", "rapidas"].map((k) => (
                <button
                  key={k}
                  onClick={() => setAbaMobile(k as any)}
                  className={`flex-1 relative z-10 text-sm font-medium px-3 py-2 rounded-full transition ${
                    abaMobile === (k as any)
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-500"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {k === "chats" && <MessageSquare className="w-4 h-4" />}
                    {k === "equipa" && <Users className="w-4 h-4" />}
                    {k === "rapidas" && <Zap className="w-4 h-4" />}
                    {k === "chats" ? "Conversas" : k === "equipa" ? "Equipa" : "Rápidas"}
                  </span>
                </button>
              ))}
              {/* indicador */}
              <motion.span
                layout
                className="absolute top-1 bottom-1 w-1/3 rounded-full bg-white dark:bg-slate-700 shadow"
                animate={{
                  x:
                    abaMobile === "chats" ? 0 : abaMobile === "equipa" ? "100%" : "200%",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            </div>
          </div>
        )}

        {/* LISTA DE CONVERSAS */}
        {abaMobile === "chats" && (
          <div className="p-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Suas conversas
                </h2>
                <button
                  onClick={() => criarChat()}
                  className="px-3 py-1.5 rounded-full text-white bg-gradient-to-r from-blue-600 to-cyan-500 active:scale-[.98] text-sm shadow"
                >
                  + Novo
                </button>
              </div>

              <div className="p-3 space-y-2">
                {chats.length === 0 && (
                  <div className="text-center py-10">
                    <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">Nenhum chat ainda.</p>
                    <button
                      onClick={() => criarChat()}
                      className="mt-3 text-sm px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    >
                      Começar conversa
                    </button>
                  </div>
                )}

                {chats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setChatSelecionado(c);
                      setAbaMobile("chat");
                    }}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition ${
                      chatSelecionado?.id === c.id
                        ? "bg-blue-50 dark:bg-slate-800 border-blue-300"
                        : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.titulo}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {c.ultima_mensagem || "Sem mensagens ainda"}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] mt-1 ${
                          c.statusLabel === "Ativa" ? "text-green-600" : "text-slate-400"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {c.statusLabel}
                      </span>
                    </div>
                    <Trash2
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmarApagarChat(c.id);
                      }}
                      className="w-4 h-4 text-slate-400 hover:text-red-500 shrink-0"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EQUIPA */}
        {abaMobile === "equipa" && (
          <div className="p-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <LifeBuoy className="w-5 h-5" /> Equipa Acrobatas
              </h3>
              <div className="space-y-2">
                {agentes.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => criarChat(`Suporte — ${a.nome}`)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="text-sm">👤 {a.nome} — {a.cargo}</span>
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <Circle size={10} className={a.online ? "text-green-500" : "text-slate-400"} />
                      {a.online ? "online" : "offline"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RÁPIDAS */}
        {abaMobile === "rapidas" && (
          <div className="p-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h3 className="font-semibold text-lg mb-3">⚡ Perguntas rápidas</h3>
              <div className="space-y-2">
                {respostas.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => enviarPerguntaRapida(r)}
                    className="w-full text-left text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    {r.icon} {r.titulo}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHAT */}
        {abaMobile === "chat" && chatSelecionado && (
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col flex-1"
          >
            <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800">
              <button onClick={() => setAbaMobile("chats")} className="p-1 rounded-md">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>

              {editandoTitulo ? (
                <div className="flex items-center gap-2 flex-1 mx-2">
                  <input
                    value={tituloTemp}
                    onChange={(e) => setTituloTemp(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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

            <div ref={listaRef} className="flex-1 overflow-y-auto p-4 space-y-2">
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

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex items-center gap-2 [padding-bottom:calc(env(safe-area-inset-bottom)+12px)]">
              <Paperclip className="w-5 h-5 text-slate-400" />
              <input
                ref={inputRef}
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarMensagem();
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
              <button
                disabled={!novaMensagem.trim()}
                onClick={() => enviarMensagem()}
                className="disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-1 active:scale-[.98] shadow"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Modal apagar */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center max-w-sm w-full border border-slate-200 dark:border-slate-700 shadow-2xl">
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

  /* ===================== DESKTOP ===================== */
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

              <div ref={listaRef} className="flex-1 overflow-y-auto p-6 space-y-3">
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
                  ref={inputRef}
                  type="text"
                  placeholder="Escreva uma mensagem..."
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                  className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#1e293b]/70 text-sm"
                />
                <button onClick={() => enviarMensagem()} disabled={!novaMensagem.trim()} className="disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Send className="w-4 h-4" /> Enviar
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 text-sm">
              <MessageCircle className="w-8 h-8" />
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
                className="w-full text-left text-sm bg-gray-50 dark:bg-[#1e293b]/60 hover:bg-gray-100 dark:hover:bg-[#1e2536] px-4 py-3 rounded-xl border border-gray-200 dark:border-[#1e293b] flex items-center gap-2"
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
