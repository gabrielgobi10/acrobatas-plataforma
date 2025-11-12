
import { useState, useEffect } from "react";
import { X, Save, CheckCircle2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function EditModal({
  perfil,
  onClose,
  onSave,
  user,
  onProfileCompleted,
}: any) {
  const [dados, setDados] = useState(perfil || {});
  const [areas, setAreas] = useState<string[]>([]);
  const [funcoes, setFuncoes] = useState<string[]>([]);
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [erros, setErros] = useState<{ [campo: string]: string }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["profissionais"]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const EXPERIENCIA = ["Menos de 1 ano", "1 a 3 anos", "3 a 5 anos", "Mais de 5 anos"];
  const DISPONIBILIDADE = ["Imediata", "Em 1 semana", "Em 15 dias", "Indisponível"];
  const NACIONALIDADES = [
    "Portuguesa", "Brasileira", "Nepalesa", "Indiana", "Ucraniana",
    "Paquistanesa", "Moldava", "Angolana", "Cabo-verdiana", "Outra"
  ];
  const IDIOMAS = ["Português","Inglês","Francês","Espanhol","Ucraniano","Russo","Hindi","Nepalês","Árabe","Italiano","Outro"];
  const RAIO = ["25 km", "50 km", "100 km", "200 km", "Todo o país"];

  useEffect(() => {
    async function carregarAreas() {
      const { data, error } = await supabase.from("conf_areas").select("nome").order("nome");
      if (!error && data) setAreas(data.map((a) => a.nome));
    }
    carregarAreas();
  }, []);

  useEffect(() => {
    async function carregarFuncoes() {
      if (!dados.areaPrincipal?.[0]) return;
      const { data, error } = await supabase
        .from("conf_funcoes")
        .select("nome, conf_areas!inner(nome)")
        .eq("conf_areas.nome", dados.areaPrincipal[0]);
      if (!error && data) setFuncoes(data.map((f) => f.nome));
    }
    carregarFuncoes();
  }, [dados.areaPrincipal]);

  useEffect(() => {
    async function carregarHabilidades() {
      if (!dados.areaPrincipal?.[0]) return;
      const { data, error } = await supabase
        .from("conf_habilidades")
        .select("nome, conf_areas!inner(nome)")
        .eq("conf_areas.nome", dados.areaPrincipal[0]);
      if (!error && data) setHabilidades(data.map((h) => h.nome));
    }
    carregarHabilidades();
  }, [dados.areaPrincipal]);

  const handleChange = (campo: string, valor: any) => {
    setErros((prev) => ({ ...prev, [campo]: "" }));
    setDados((prev: any) => {
      if (campo === "areaPrincipal") {
        return { ...prev, areaPrincipal: [valor], funcaoObra: "", habilidades: [] };
      }
      return { ...prev, [campo]: valor };
    });
  };

  const validarCampos = () => {
    const novosErros: any = {};
    const obrigatorios = {
      areaPrincipal: dados.areaPrincipal?.[0],
      funcaoObra: dados.funcaoObra,
      nivel: dados.nivel,
      anosExp: dados.anosExp,
      disponibilidade: dados.disponibilidade,
      nome: dados.nome,
      telefone: dados.telefone,
      dataNasc: dados.dataNasc,
      nacionalidade: dados.nacionalidade,
      cidadeBase: dados.cidadeBase,
      podeViajar: dados.podeViajar,
      raio: dados.raio,
    };
    Object.entries(obrigatorios).forEach(([campo, valor]) => {
      if (!valor || valor.toString().trim() === "") novosErros[campo] = "Campo obrigatório";
    });
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      const el = document.querySelector(`[name="${Object.keys(novosErros)[0]}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(novosErros).length === 0;
  };

  const handleSalvar = async () => {
    if (!validarCampos()) return;
    try {
      setSalvando(true);
      const perfilCompleto = true;
      const anosExpMap: any = { "Menos de 1 ano": 0, "1 a 3 anos": 2, "3 a 5 anos": 4, "Mais de 5 anos": 6 };

      const { error } = await supabase.from("profissionais_perfil").upsert({
        usuario_id: user?.id,
        nome_completo: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        data_nascimento: dados.dataNasc,
        nacionalidade: dados.nacionalidade,
        idiomas: dados.idiomas || [],
        area_principal: dados.areaPrincipal?.[0] || null,
        nivel: dados.nivel,
        anos_experiencia: anosExpMap[dados.anosExp] ?? null,
        disponibilidade: dados.disponibilidade,
        funcao_obra: dados.funcaoObra,
        cidade_base: dados.cidadeBase,
        pode_viajar: dados.podeViajar === "Sim",
        pode_alojamento: dados.podeAlojamento === "Sim",
        raio_deslocacao: dados.raio,
        habilidades: dados.habilidades || [],
        perfil_completo: perfilCompleto,
        status_perfil: perfilCompleto ? "completo" : "incompleto",
        progresso: perfilCompleto ? 100 : 50,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "usuario_id" });

      if (error) {
        setMensagem({ tipo: "erro", texto: "❌ Erro ao salvar no servidor." });
      } else {
        setMensagem({ tipo: "sucesso", texto: "✅ Alterações salvas com sucesso!" });
        setTimeout(() => {
          setMensagem(null);
          onSave?.({ ...dados, perfil_completo: true });
          onProfileCompleted?.();
          onClose();
        }, 1000);
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "❌ Erro interno ao salvar." });
    } finally {
      setSalvando(false);
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-lg flex flex-col border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Editar Perfil <span className="text-xs text-sky-400 font-medium">* Campos obrigatórios</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={22} />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 sm:space-y-8">
          {mensagem && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              mensagem.tipo === "sucesso"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {mensagem.tipo === "sucesso" ? <CheckCircle2 size={18} /> : "⚠️"} {mensagem.texto}
            </div>
          )}

          {/* Seções (modo adaptativo) */}
          {isMobile ? (
            <>
              <Accordion id="profissionais" title="Informações Profissionais" openSections={openSections} toggle={toggleSection}>
                <Profissionais dados={dados} handleChange={handleChange} erros={erros} areas={areas} funcoes={funcoes} />
              </Accordion>
              <Accordion id="pessoais" title="Informações Pessoais" openSections={openSections} toggle={toggleSection}>
                <Pessoais dados={dados} handleChange={handleChange} erros={erros} IDIOMAS={IDIOMAS} NACIONALIDADES={NACIONALIDADES} />
              </Accordion>
              <Accordion id="mobilidade" title="Localização e Mobilidade" openSections={openSections} toggle={toggleSection}>
                <Mobilidade dados={dados} handleChange={handleChange} erros={erros} RAIO={RAIO} />
              </Accordion>
              <Accordion id="habilidades" title="Habilidades (opcional)" openSections={openSections} toggle={toggleSection}>
                <Habilidades dados={dados} handleChange={handleChange} habilidades={habilidades} />
              </Accordion>
            </>
          ) : (
            <>
              <Section titulo="Informações Profissionais"><Profissionais {...{dados, handleChange, erros, areas, funcoes}}/></Section>
              <Section titulo="Informações Pessoais"><Pessoais {...{dados, handleChange, erros, IDIOMAS, NACIONALIDADES}}/></Section>
              <Section titulo="Localização e Mobilidade"><Mobilidade {...{dados, handleChange, erros, RAIO}}/></Section>
              <Section titulo="Habilidades (opcional)"><Habilidades {...{dados, handleChange, habilidades}}/></Section>
            </>
          )}
        </div>

        {/* Rodapé fixo */}
        <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end gap-3">
          <button onClick={onClose} disabled={salvando} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className={`px-5 py-2 rounded-lg font-medium shadow transition ${
              salvando ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:opacity-90"
            }`}
          >
            <Save size={16} className="inline mr-2" /> {salvando ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* === Subcomponentes das seções (mantidos idênticos, só modularizados) === */
function Section({ titulo, children }: any) {
  return (
    <div>
      <h3 className="font-semibold mb-3 text-slate-900 dark:text-white">{titulo}</h3>
      {children}
    </div>
  );
}

function Accordion({ id, title, children, openSections, toggle }: any) {
  const isOpen = openSections.includes(id);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full flex justify-between items-center px-4 py-3 text-left font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
      >
        {title}
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="p-4 bg-white dark:bg-slate-900">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* === Campos === */
function Input({ name, label, valor, onChange, tipo = "text", disabled = false, erro }: any) {
  return (
    <div className="flex flex-col relative">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        name={name}
        type={tipo}
        value={valor || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`bg-slate-100 dark:bg-slate-800 border rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 outline-none ${
          erro ? "border-red-500 focus:ring-red-400" : "border-slate-300 dark:border-slate-700 focus:ring-sky-500"
        } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
      />
      {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}
    </div>
  );
}

function Select({ name, label, valor, onChange, opcoes = [], disabled = false, erro }: any) {
  return (
    <div className="flex flex-col relative">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <select
        name={name}
        value={valor || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`bg-slate-100 dark:bg-slate-800 border rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 outline-none ${
          erro ? "border-red-500 focus:ring-red-400" : "border-slate-300 dark:border-slate-700 focus:ring-sky-500"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <option value="">Selecionar...</option>
        {opcoes.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}
    </div>
  );
}

function MultiSelect({ label, valores = [], onChange, opcoes = [] }: any) {
  const toggle = (v: string) => {
    const nova = valores.includes(v) ? valores.filter((x: string) => x !== v) : [...valores, v];
    onChange(nova);
  };
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((op: string) => (
          <button
            key={op}
            onClick={() => toggle(op)}
            type="button"
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
              valores.includes(op)
                ? "bg-cyan-500 text-white border-cyan-500"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  );
}

/* === Blocos === */
function Profissionais({ dados, handleChange, erros, areas, funcoes }: any) {
  const EXPERIENCIA = ["Menos de 1 ano", "1 a 3 anos", "3 a 5 anos", "Mais de 5 anos"];
  const DISPONIBILIDADE = ["Imediata", "Em 1 semana", "Em 15 dias", "Indisponível"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Select
        name="areaPrincipal"
        label="Área Principal *"
        valor={dados.areaPrincipal?.[0] || ""}
        opcoes={areas}
        onChange={(v) => handleChange("areaPrincipal", v)}
        erro={erros.areaPrincipal}
      />
      <Input
        name="nivel"
        label="Nível (definido pela empresa) *"
        valor={dados.nivel}
        disabled
        erro={erros.nivel}
      />
      <Select
        name="anosExp"
        label="Anos de Experiência *"
        valor={dados.anosExp}
        opcoes={EXPERIENCIA}
        onChange={(v) => handleChange("anosExp", v)}
        erro={erros.anosExp}
      />
      <Select
        name="disponibilidade"
        label="Disponibilidade *"
        valor={dados.disponibilidade}
        opcoes={DISPONIBILIDADE}
        onChange={(v) => handleChange("disponibilidade", v)}
        erro={erros.disponibilidade}
      />
      <Select
        name="funcaoObra"
        label="Função na Obra *"
        valor={dados.funcaoObra}
        opcoes={funcoes}
        onChange={(v) => handleChange("funcaoObra", v)}
        disabled={!dados.areaPrincipal?.[0]}
        erro={erros.funcaoObra}
      />
    </div>
  );
}

function Pessoais({ dados, handleChange, erros, IDIOMAS, NACIONALIDADES }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        name="nome"
        label="Nome Completo *"
        valor={dados.nome}
        onChange={(v) => handleChange("nome", v)}
        erro={erros.nome}
      />
      <Input
        name="email"
        label="Email"
        valor={dados.email}
        onChange={(v) => handleChange("email", v)}
      />
      <Input
        name="telefone"
        label="Telefone *"
        valor={dados.telefone}
        onChange={(v) => handleChange("telefone", v)}
        erro={erros.telefone}
      />
      <Input
        name="dataNasc"
        label="Data de Nascimento *"
        tipo="date"
        valor={dados.dataNasc ? dados.dataNasc.split("/").reverse().join("-") : ""}
        onChange={(v) => handleChange("dataNasc", v)}
        erro={erros.dataNasc}
      />
      <Select
        name="nacionalidade"
        label="Nacionalidade *"
        valor={dados.nacionalidade}
        opcoes={NACIONALIDADES}
        onChange={(v) => handleChange("nacionalidade", v)}
        erro={erros.nacionalidade}
      />
      <MultiSelect
        label="Idiomas"
        valores={dados.idiomas}
        opcoes={IDIOMAS}
        onChange={(v) => handleChange("idiomas", v)}
      />
    </div>
  );
}

function Mobilidade({ dados, handleChange, erros, RAIO }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        name="cidadeBase"
        label="Cidade Base *"
        valor={dados.cidadeBase}
        onChange={(v) => handleChange("cidadeBase", v)}
        erro={erros.cidadeBase}
      />
      <Select
        name="podeViajar"
        label="Pode Viajar? *"
        valor={dados.podeViajar}
        opcoes={["Sim", "Não"]}
        onChange={(v) => handleChange("podeViajar", v)}
        erro={erros.podeViajar}
      />
      <Select
        name="podeAlojamento"
        label="Pode Alojamento?"
        valor={dados.podeAlojamento}
        opcoes={["Sim", "Não"]}
        onChange={(v) => handleChange("podeAlojamento", v)}
      />
      <Select
        name="raio"
        label="Raio de Deslocação *"
        valor={dados.raio}
        opcoes={RAIO}
        onChange={(v) => handleChange("raio", v)}
        erro={erros.raio}
      />
    </div>
  );
}

function Habilidades({ dados, handleChange, habilidades }: any) {
  return (
    <>
      {!dados.areaPrincipal?.[0] ? (
        <p className="text-sm text-slate-500 italic">
          Selecione uma área para ver as habilidades disponíveis.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {habilidades.map((hab: string) => (
            <button
              key={hab}
              onClick={() => {
                const jaTem = dados.habilidades.includes(hab);
                handleChange(
                  "habilidades",
                  jaTem
                    ? dados.habilidades.filter((h: string) => h !== hab)
                    : [...dados.habilidades, hab]
                );
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                dados.habilidades.includes(hab)
                  ? "bg-cyan-500 text-white border-cyan-500"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {hab}
            </button>
          ))}
        </div>
      )}
    </>
  );
}


