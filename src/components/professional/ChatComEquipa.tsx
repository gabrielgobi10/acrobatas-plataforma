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
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";

export default function ChatComEquipa() {
  const { user } = useAuth();

  const [chats, setChats] = useState<any[]>([]);
  const [chatSelecionado, setChatSelecionado] = useState<any>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloTemp, setTituloTemp] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [chatParaApagar, setChatParaApagar] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [abaMobile, setAbaMobile] = useState<"chats" | "equipa" | "rapidas" | "chat">("chats");

  const agentes = [
    { nome: "Débora", cargo: "RH", online: true },
    { nome: "Francisco", cargo: "Obras", online: true },
    { nome: "Paulo", cargo: "Financeiro", online: false },
  ];

  const respostas = [
    {
      titulo: "Documentação obrigatória",
      respostaAutomatica:
        "Para iniciar em obra é obrigatório enviar: ficha médica, cartão cidadão e comprovativo de morada.",
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
        "A certidão pode ser solicitada pelo portal da Segurança Social Direta, acessando com NISS e palavra-passe.",
      icon: <Landmark className="w-4 h-4 text-gray-500" />,
    },
    {
      titulo: "Equipa e obras",
      respostaAutomatica:
        "No momento temos equipas ativas em Lisboa, Porto e Braga. Consulte a equipa para saber mais detalhes.",
      icon: <Building2 className="w-4 h-4 text-red-500" />,
    },
  ];

  // Detectar mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 📦 Carregar conversas
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

    const validas = await Promise.all(
      (sessoes || []).map(async (chat) => {
        const { data: ultimaMsg } = await supabase
          .from("chat_mensagens")
          .select("criado_em")
          .eq("sessao_id", chat.id)
          .order("criado_em", { ascending: false })
          .limit(1)
          .single();

        if (!ultimaMsg) return null;

        const diffHoras =
          (new Date().getTime() - new Date(ultimaMsg.criado_em).getTime()) /
          (1000 * 60 * 60);

        return {
          ...chat,
          status: diffHoras < 24 ? "Ativa" : "Inativa",
        };
      })
    );

    const conversasComMensagens = validas.filter(Boolean);
    setChats(conversasComMensagens);
  };

  // ➕ Criar nova conversa
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
      setChatSelecionado(existente);
      setTituloTemp(existente.titulo);
      if (isMobile) setAbaMobile("chat");
      return;
    }

    const { data, error } = await supabase
      .from("chat_sessoes")
      .insert([{ profissional_id: user.id, titulo: tituloChat, status: "ativo" }])
      .select()
      .single();

    if (!error && data) {
      setChats((prev) => [data, ...prev]);
      setChatSelecionado(data);
      setTituloTemp(data.titulo);
      if (isMobile) setAbaMobile("chat");
    }
  };

  // ✏️ Salvar novo título
  const salvarTitulo = async () => {
    if (!chatSelecionado || !tituloTemp.trim()) return;
    await supabase
      .from("chat_sessoes")
      .update({ titulo: tituloTemp })
      .eq("id", chatSelecionado.id);
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatSelecionado.id ? { ...c, titulo: tituloTemp } : c
      )
    );
    setChatSelecionado({ ...chatSelecionado, titulo: tituloTemp });
    setEditandoTitulo(false);
  };

  // 📤 Enviar mensagem
  const enviarMensagem = async (conteudoCustom?: string) => {
    const conteudo = conteudoCustom || novaMensagem.trim();
    if (!conteudo || !chatSelecionado) return;
    const { error } = await supabase.from("chat_mensagens").insert([
      {
        sessao_id: chatSelecionado.id,
        remetente_id: user?.id,
        conteudo,
        tipo: "texto",
      },
    ]);
    if (!error) setNovaMensagem("");
  };

  // 💬 Perguntas rápidas
  const enviarPerguntaRapida = async (r: any) => {
    if (!chatSelecionado) return;
    await enviarMensagem(r.titulo);
    setTimeout(async () => {
      await supabase.from("chat_mensagens").insert([
        {
          sessao_id: chatSelecionado.id,
          remetente_id: null,
          conteudo: r.respostaAutomatica,
          tipo: "texto",
        },
      ]);
    }, 600);
  };

  // 🧠 Realtime mensagens
  useEffect(() => {
    if (!chatSelecionado) return;
    const canal = supabase
      .channel(`mensagens-${chatSelecionado.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        (payload) => {
          const nova = payload.new;
          if (nova.sessao_id === chatSelecionado.id)
            setMensagens((prev) => [...prev, nova]);
        }
      )
      .subscribe();

    const carregarMensagens = async () => {
      const { data } = await supabase
        .from("chat_mensagens")
        .select("*")
        .eq("sessao_id", chatSelecionado.id)
        .order("criado_em", { ascending: true });
      setMensagens(data || []);
    };
    carregarMensagens();
    return () => supabase.removeChannel(canal);
  }, [chatSelecionado]);

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

  // ✅ MOBILE
  if (isMobile) {
    return (
    <div className="min-h-screen flex flex-col bg-transparent backdrop-blur-xl text-slate-900 dark:text-slate-100 transition-all duration-500 border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.2)] rounded-2xl">


        {/* Abas topo */}
        {abaMobile !== "chat" && (
          <div className="flex justify-around border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
            <button onClick={() => setAbaMobile("chats")} className={`flex-1 py-3 flex flex-col items-center text-sm font-medium ${abaMobile === "chats" ? "text-blue-600 dark:text-cyan-400 border-b-2 border-blue-500" : "text-slate-500"}`}>
              <MessageSquare className="w-5 h-5 mb-0.5" /> Conversas
            </button>
            <button onClick={() => setAbaMobile("equipa")} className={`flex-1 py-3 flex flex-col items-center text-sm font-medium ${abaMobile === "equipa" ? "text-blue-600 dark:text-cyan-400 border-b-2 border-blue-500" : "text-slate-500"}`}>
              <Users className="w-5 h-5 mb-0.5" /> Equipa
            </button>
            <button onClick={() => setAbaMobile("rapidas")} className={`flex-1 py-3 flex flex-col items-center text-sm font-medium ${abaMobile === "rapidas" ? "text-blue-600 dark:text-cyan-400 border-b-2 border-blue-500" : "text-slate-500"}`}>
              <Zap className="w-5 h-5 mb-0.5" /> Rápidas
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Conversas */}
          {abaMobile === "chats" && (
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-lg">💬 Suas conversas</h2>
                <button onClick={() => criarChat()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm">+ Novo</button>
              </div>
              {chats.map((chat) => (
                <div key={chat.id} onClick={() => { setChatSelecionado(chat); setAbaMobile("chat"); }} className={`p-3 rounded-lg border flex justify-between items-center ${chatSelecionado?.id === chat.id ? "bg-blue-50 dark:bg-slate-800 border-blue-400" : "hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent"}`}>
                  <div className="w-full">
                    <p className="font-medium text-sm">{chat.titulo}</p>
                    <p className="text-xs text-slate-500 truncate">{chat.status === "Ativa" ? "🟢 Ativa" : "⚪ Inativa"}</p>
                  </div>
                  <Trash2 onClick={(e) => { e.stopPropagation(); confirmarApagarChat(chat.id); }} className="w-4 h-4 text-slate-400 hover:text-red-500" />
                </div>
              ))}
            </div>
          )}

          {/* Equipa */}
          {abaMobile === "equipa" && (
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-lg">💼 Equipa Acrobatas</h3>
              {agentes.map((a, i) => (
                <button key={i} onClick={() => criarChat(`Bate-papo com ${a.nome}`)} className="flex justify-between w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <span className="text-sm">👤 {a.nome} — {a.cargo}</span>
                  <Circle size={10} className={a.online ? "text-green-500" : "text-gray-400"} />
                </button>
              ))}
            </div>
          )}

          {/* Rápidas */}
          {abaMobile === "rapidas" && (
            <div className="p-5 space-y-3">
              <h3 className="font-semibold text-lg">⚡ Perguntas rápidas</h3>
              {respostas.map((r, i) => (
                <button key={i} onClick={() => enviarPerguntaRapida(r)} className="w-full text-left text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  {r.icon} {r.titulo}
                </button>
              ))}
            </div>
          )}

          {/* Chat */}
          {abaMobile === "chat" && chatSelecionado && (
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0">
                <button onClick={() => setAbaMobile("chats")}>
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </button>
                <h3 className="font-semibold text-sm">{chatSelecionado.titulo}</h3>
                <button onClick={() => setChatSelecionado(null)} className="text-xs text-red-500">
                  Encerrar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {mensagens.map((msg, i) => (
                  <div key={i} className={`flex ${msg.remetente_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${msg.remetente_id === user?.id ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100"}`}>
                      {msg.conteudo}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-slate-400" />
                <input value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarMensagem()} placeholder="Escreva uma mensagem..." className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                <button onClick={() => enviarMensagem()} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-1">
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </div>

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

  // ✅ DESKTOP
  return (
    <>
    <div className="min-h-screen w-full px-6 py-10 bg-transparent flex justify-center transition-all duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-7xl">
        {/* Sidebar */}
        <div className="col-span-1 bg-white dark:bg-[#111827]/90 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.7)] backdrop-blur-xl border border-gray-200 dark:border-[#1e293b]/70 flex flex-col transition-all duration-500">
          
                   <div className="flex items-center justify-between p-4 border-b dark:border-[#1e293b]/70">
            <h2 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-200">
              💬 Suas conversas
            </h2>
            <button
              onClick={() => criarChat()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm"
            >
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
              <p className="text-center text-gray-400 mt-10 text-sm">
                Nenhum chat ainda.
              </p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setChatSelecionado(chat)}
                  className={`p-3 rounded-lg cursor-pointer flex justify-between items-center border transition ${
                    chatSelecionado?.id === chat.id
                      ? "bg-blue-50 dark:bg-[#1e293b] border-blue-400"
                      : "hover:bg-gray-50 dark:hover:bg-[#1e2536] border-transparent"
                  }`}
                >
                  <div className="flex flex-col w-full">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm text-gray-700 dark:text-gray-100 truncate">
                        {chat.titulo}
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {new Date(chat.criado_em).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {chat.ultima_mensagem || "Sem mensagens ainda"}
                    </p>

                    <p
                      className={`text-xs mt-1 ${
                        chat.status === "Ativa"
                          ? "text-green-500"
                          : "text-gray-400 italic"
                      }`}
                    >
                      {chat.status === "Ativa" ? "🟢 Ativa" : "⚪ Inativa"}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmarApagarChat(chat.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat principal */}
        <div className="col-span-2 bg-white dark:bg-[#111827]/90 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.7)] border border-gray-200 dark:border-[#1e293b]/70 flex flex-col transition-all duration-500">
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
                    <button
                      onClick={salvarTitulo}
                      className="text-green-600 hover:text-green-700"
                    >
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
                    <button
                      onClick={() => setChatSelecionado(null)}
                      className="text-sm text-gray-400 hover:text-red-500"
                    >
                      ✖ Encerrar
                    </button>
                  </>
                )}
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-transparent">
                {mensagens.length === 0 ? (
                  <p className="text-center text-gray-400">
                    Nenhuma mensagem ainda. Comece a conversar!
                  </p>
                ) : (
                  mensagens.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.remetente_id === user?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-[70%] text-sm ${
                          msg.remetente_id === user?.id
                            ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-none"
                            : "bg-gray-200 dark:bg-[#1e293b] dark:text-gray-100 rounded-bl-none"
                        }`}
                      >
                        {msg.conteudo}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-white dark:bg-[#0f172a]/80 flex items-center gap-3">
                <Paperclip className="w-5 h-5 text-gray-400 cursor-pointer" />
                <input
                  type="text"
                  placeholder="Escreva uma mensagem..."
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                  className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#1e293b]/70 text-sm text-gray-800 dark:text-gray-100"
                />
                <button
                  onClick={() => enviarMensagem()}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
                >
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

        {/* Lateral direita */}
        <div className="col-span-1 bg-white dark:bg-[#111827]/90 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.7)] border border-gray-200 dark:border-[#1e293b]/70 flex flex-col transition-all duration-500">
          <div className="p-5 border-b dark:border-[#1e293b]/70">
            <h3 className="font-semibold text-gray-700 dark:text-gray-100 flex items-center gap-2">
              💼 Equipa Acrobatas
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Tire dúvidas com o suporte ou gestão.
            </p>
          </div>

          <div className="p-5 border-b dark:border-[#1e293b]/70">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Agentes online
            </h3>
            {agentes.map((a, i) => (
              <button
                key={i}
                onClick={() => criarChat(`Bate-papo com ${a.nome}`)}
                className="flex items-center justify-between w-full mb-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-[#1e2536] transition"
              >
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  👤 {a.nome} — {a.cargo}
                </span>
                <Circle
                  size={10}
                  className={a.online ? "text-green-500" : "text-gray-400"}
                />
              </button>
            ))}
          </div>

          {/* Perguntas rápidas */}
          <div className="flex-1 p-5 space-y-3 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Perguntas rápidas
            </h3>
            {respostas.map((r, i) => (
              <button
                key={i}
                onClick={() => enviarPerguntaRapida(r)}
                className="w-full text-left text-sm text-gray-700 dark:text-gray-200 
                  bg-gray-50 dark:bg-[#1e293b]/60 hover:bg-gray-100 dark:hover:bg-[#1e2536] 
                  px-4 py-3 rounded-xl border border-gray-200 dark:border-[#1e293b] 
                  flex items-center gap-2 transition-all duration-200"
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

      {/* 🔥 Modal de confirmação */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#111827]/95 rounded-2xl p-6 shadow-2xl text-center max-w-sm w-full border border-gray-200 dark:border-[#1e293b]/70 transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Apagar conversa?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Esta ação não poderá ser desfeita.
            </p>
            <div className="flex justify-center gap-3 mt-5">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 
                  hover:bg-gray-100 dark:hover:bg-[#1e2536] text-gray-700 dark:text-gray-300 text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={apagarChat}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 
                  text-white text-sm shadow transition-all"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>   {/* 👈 fecha layout desktop */}
    </>
  );   {/* 👈 fecha return e componente */}
}

