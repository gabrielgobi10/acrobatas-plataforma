
import { useState, useEffect } from "react";
import {
  Edit3,
  TrendingUp,
  User,
  MapPin,
  Briefcase,
  Star,
  FileCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Shield,
  HeartPulse,
  HardHat,
  Award,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Joyride, { STATUS } from "react-joyride";
import EditModal from "./EditModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function PerfilProfissional() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [openEdit, setOpenEdit] = useState(false);
  const [runTutorial, setRunTutorial] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);
  const [perfilCompleto, setPerfilCompleto] = useState(false);

  // Tutorial inicial
  useEffect(() => {
    if (!localStorage.getItem("tutorial_editar_perfil")) {
      setTimeout(() => setRunTutorial(true), 1000);
    }
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finished = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finished.includes(status)) {
      setRunTutorial(false);
      localStorage.setItem("tutorial_editar_perfil", "true");
    }
  };

  // Carregar perfil do Supabase
  useEffect(() => {
    const carregarPerfil = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profissionais_perfil")
        .select("*")
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("❌ Erro ao carregar perfil:", error.message);
        return;
      }

      if (data) {
        setPerfil({
          nome: data.nome_completo || "",
          email: data.email || user.email,
          telefone: data.telefone || "",
          dataNasc: data.data_nascimento || "",
          nacionalidade: data.nacionalidade || "",
          idiomas: data.idiomas || [],
          areaPrincipal: data.area_principal ? [data.area_principal] : [],
          nivel: data.nivel || "Oficial 1",
          anosExp: data.anos_experiencia
            ? `${data.anos_experiencia} anos`
            : "1 a 3 anos",
          disponibilidade: data.disponibilidade || "Imediata",
          funcaoObra: data.funcao_obra || "",
          cidadeBase: data.cidade_base || "",
          podeViajar: data.pode_viajar ? "Sim" : "Não",
          podeAlojamento: data.pode_alojamento ? "Sim" : "Não",
          raio: data.raio_deslocacao || "100 km",
          habilidades: data.habilidades || [],
          perfil_completo: data.perfil_completo || false,
        });
        setPerfilCompleto(data.perfil_completo);
      } else {
        setPerfil({
          nome: user.email || "Usuário",
          email: user.email || "",
          perfil_completo: false,
        });
      }
    };
    carregarPerfil();
  }, [user]);

  const valorHora = 7.0;
  const diaria8h = 56.0;
  const extra = 8.75;

  if (!perfil)
    return (
      <div className="text-center text-slate-500 dark:text-slate-400 mt-20">
        Carregando perfil...
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-3 md:px-6 py-6 md:py-12 text-slate-800 dark:text-slate-100 transition-all">
      {/* JOYRIDE */}
      <Joyride
        run={runTutorial}
        callback={handleJoyrideCallback}
        continuous
        showProgress
        showSkipButton
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3b82f6",
            backgroundColor: "#ffffff",
            textColor: "#1e293b",
            arrowColor: "#ffffff",
          },
        }}
        steps={[
          {
            target: ".botao-editar-perfil",
            content: "Clique aqui para editar e completar seu perfil.",
            disableBeacon: true,
          },
        ]}
      />

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden 
          bg-gradient-to-r from-gray-100 via-white to-gray-50 
          dark:from-slate-800/90 dark:via-slate-900/95 dark:to-slate-950/90
          backdrop-blur-md rounded-2xl md:rounded-3xl p-5 md:p-10
          shadow-[0_4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.25)]
          mb-6 md:mb-12 border border-slate-200 dark:border-slate-700/40"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-6">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 text-white flex items-center justify-center text-xl md:text-3xl font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-4 ring-cyan-300/30">
              {perfil.nome?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <h1 className="text-xl md:text-3xl font-semibold tracking-tight">
                {perfil.nome}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
                {perfil.funcaoObra} • {perfil.cidadeBase}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-500/30 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm">
                  {perfil.nivel}
                </span>
                <span className="bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-400/30 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm">
                  {perfilCompleto ? "Perfil Completo" : "Em Progresso"}
                </span>
              </div>

              <div className="mt-2">
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-0.5">
                  💶 €{valorHora.toFixed(2)}/h • 🕗 8h: €
                  {diaria8h.toFixed(2)} • ⏱ Extra: €{extra.toFixed(2)}
                </p>
                <div className="w-48 md:w-72 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: perfilCompleto ? "100%" : "65%" }}
                  />
                </div>
                <p className="text-[11px] mt-1 text-slate-500 italic dark:text-slate-500">
                  {perfilCompleto
                    ? "✅ Seu perfil está completo!"
                    : "Complete seu perfil para liberar tudo."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
            <button
              onClick={() => setOpenEdit(true)}
              className="botao-editar-perfil flex items-center justify-center gap-2 px-5 py-2.5 md:px-6 md:py-3 
                bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 
                hover:shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:scale-[1.02] 
                text-white rounded-xl text-sm md:text-base font-medium shadow-md transition-all"
            >
              <Edit3 size={16} /> Editar
            </button>
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 md:px-6 md:py-3 
              bg-slate-100 text-blue-600 border border-slate-200 hover:bg-slate-200 
              dark:bg-slate-800 dark:text-cyan-400 dark:border-slate-600 
              rounded-xl text-sm md:text-base font-medium transition-all">
              <TrendingUp size={16} /> Carreira
            </button>
          </div>
        </div>
      </motion.div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <AnimatedCard title="Informações Profissionais" icon={<Briefcase />}>
          <Grid label="Área Principal" value={perfil.areaPrincipal.join(", ")} />
          <Grid label="Nível" value={perfil.nivel} />
          <Grid label="Experiência" value={perfil.anosExp} />
          <Grid label="Disponibilidade" value={perfil.disponibilidade} />
          <Grid label="Função" value={perfil.funcaoObra} />
        </AnimatedCard>

        <AnimatedCard title="Informações Pessoais" icon={<User />}>
          <Grid label="Nome" value={perfil.nome} />
          <Grid label="Email" value={perfil.email} />
          <Grid label="Telefone" value={perfil.telefone} />
          <Grid label="Nascimento" value={perfil.dataNasc} />
          <Grid label="Nacionalidade" value={perfil.nacionalidade} />
          <Grid label="Idiomas" value={perfil.idiomas.join(", ")} />
        </AnimatedCard>

        <AnimatedCard title="Localização e Mobilidade" icon={<MapPin />}>
          <Grid label="Cidade Base" value={perfil.cidadeBase} />
          <Grid label="Pode Viajar?" value={perfil.podeViajar} />
          <Grid label="Alojamento?" value={perfil.podeAlojamento} />
          <Grid label="Raio" value={perfil.raio} />
        </AnimatedCard>

<AnimatedCard title="Habilidades" icon={<Star />}>
  <div className="flex flex-wrap gap-2 mt-2">
    {perfil.habilidades.map((skill: string) => (
      <span
        key={skill}
        className="
          px-3 py-1 text-xs font-medium rounded-full border transition-all
          bg-blue-50 text-blue-700 border-blue-200
          dark:bg-[#0f172a]/70 dark:text-cyan-100 dark:border-cyan-500/40
          dark:hover:bg-[#1e293b]/80 dark:hover:border-cyan-400 dark:hover:text-white
          shadow-[0_0_6px_rgba(56,189,248,0.25)] dark:shadow-[0_0_8px_rgba(56,189,248,0.35)]
        "
        style={{
          backdropFilter: "blur(6px)",
        }}
      >
        {skill}
      </span>
    ))}
  </div>
</AnimatedCard>




        <AnimatedCard
          title="Documentos e Certificações"
          icon={<FileCheck />}
          className="md:col-span-2"
        >
          <Doc label="Cartão de Cidadão" status="Aprovado" icon={<CheckCircle2 />} />
          <Doc label="NIF" status="Aprovado" icon={<FileText />} />
          <Doc label="Segurança Social" status="Aprovado" icon={<Shield />} />
          <Doc label="Exame Médico" status="Pendente" icon={<HeartPulse />} />
          <Doc label="Ficha EPI" status="Aprovado" icon={<HardHat />} />
          <Doc label="Seguro de Trabalho" status="Rejeitado" icon={<XCircle />} />
          <Doc label="Formação em Segurança" status="Pendente" icon={<Award />} />
          <Doc label="Certificado Profissional" status="Aprovado" icon={<Briefcase />} />

          <button
            onClick={() => navigate("/documentos")}
            className="mt-5 flex items-center justify-center gap-2 px-5 py-2.5 
              bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:scale-[1.02] 
              text-white rounded-xl font-medium text-sm shadow-md transition-all w-full md:w-auto"
          >
            <FileCheck size={16} /> Anexar Documento
          </button>
        </AnimatedCard>
      </div>

      <div className="flex justify-center mt-8 md:mt-12">
        <button className="flex items-center justify-center gap-2 px-6 py-2.5 md:px-8 md:py-3 
          bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 
          hover:shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:scale-[1.02] 
          text-white rounded-xl font-medium text-sm md:text-base shadow-md transition-all">
          <Download size={16} /> Baixar PDF do CV
        </button>
      </div>

      {openEdit && (
        <EditModal
          perfil={perfil}
          user={user}
          onClose={() => setOpenEdit(false)}
          onSave={(novo) => setPerfil(novo)}
          onProfileCompleted={() => setPerfilCompleto(true)}
        />
      )}
    </div>
  );
}

/* ==== Subcomponentes ==== */
function AnimatedCard({ title, icon, children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl p-5 md:p-7 border backdrop-blur-md 
        bg-gradient-to-br from-gray-100 to-white border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.05)] 
        dark:from-slate-800/80 dark:to-slate-900/90 dark:border-slate-700/50 
        dark:shadow-[0_4px_15px_rgba(0,0,0,0.25)] 
        hover:shadow-[0_0_12px_rgba(56,189,248,0.15)] dark:hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all ${className}`}
    >
      <div className="flex items-center gap-2 mb-3 md:mb-5">
        {icon}
        <h2 className="font-semibold text-base md:text-lg">{title}</h2>
      </div>
      <div className="space-y-1 text-sm">{children}</div>
    </motion.div>
  );
}

function Grid({ label, value }: any) {
  return (
    <p className="flex justify-between border-b border-dotted border-slate-300 dark:border-slate-600 pb-1 text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}:</span>
      <span className="text-slate-900 dark:text-slate-100 font-medium">
        {value || "—"}
      </span>
    </p>
  );
}

function Doc({ label, status, icon }: any) {
  const colorMap = {
    Aprovado:
      "text-green-700 bg-green-100 border border-green-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-400/20",
    Pendente:
      "text-amber-700 bg-amber-100 border border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-400/20",
    Rejeitado:
      "text-red-700 bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-400/20",
  };

  const iconColorMap: any = {
    "Cartão de Cidadão": "text-blue-500 dark:text-blue-400",
    NIF: "text-indigo-500 dark:text-indigo-400",
    "Segurança Social": "text-cyan-500 dark:text-cyan-400",
    "Exame Médico": "text-rose-500 dark:text-rose-400",
    "Ficha EPI": "text-yellow-500 dark:text-yellow-400",
    "Seguro de Trabalho": "text-red-500 dark:text-red-400",
    "Formação em Segurança": "text-amber-500 dark:text-amber-400",
    "Certificado Profissional": "text-emerald-500 dark:text-emerald-400",
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-all px-2">
      <div className="flex items-center gap-2">
        <div className={`${iconColorMap[label]} flex items-center drop-shadow-[0_0_6px_rgba(59,130,246,0.2)]`}>
          {icon}
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <span
        className={`text-xs px-3 py-1 rounded-full font-medium ${colorMap[status]
        }`}
      >
        {status}
      </span>
    </div>
  );
}

