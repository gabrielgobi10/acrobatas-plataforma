import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

// 🔹 Login
import { LoginPage } from "./components/LoginPage";

// 🏢 Empresa
import CompanyDashboard from "./components/company/CompanyDashboard";
import ObrasPage from "./components/company/Obras";
import DetalhesObraAtiva from "./components/company/DetalhesObraAtiva";
import Profissionais from "./components/company/Profissionais";
import ProfissionalDetalhes from "./components/company/ProfissionalDetalhes";
import Relatorios from "./components/company/Relatorios";
import ChatComEquipa from "./components/company/ChatComEquipa";
import PerfilEmpresa from "./components/company/CentralDeNavegacaoEmpresa/Outros/PerfilEmpresa";
import Notificacoes from "./components/company/CentralDeNavegacaoEmpresa/Outros/Notificacoes";

// 👨‍💼 Admin e Mestre
import AdminDashboard from "./components/admin/Admindashboard/AdminDashboard";
import GabrielDashboard from "./components/admin/GabrielDashboard/GabrielDashboard";
import { MestreDashboard } from "./components/mestre/MestreDashboard";

// 👷 Profissional
import { ProfessionalDashboard } from "./components/professional/ProfessionalDashboard";

// 📊 Central de Navegação da Empresa
import NovosPedidos from "./components/company/CentralDeNavegacaoEmpresa/Pedidos/NovosPedidos";
import EmAvaliacao from "./components/company/CentralDeNavegacaoEmpresa/Pedidos/EmAvaliacao";
import Aprovados from "./components/company/CentralDeNavegacaoEmpresa/Pedidos/Aprovados";

import ObrasAtivas from "./components/company/CentralDeNavegacaoEmpresa/Obras/ObrasAtivas";
import Historico from "./components/company/CentralDeNavegacaoEmpresa/Obras/Historico";
import AdicionarObra from "./components/company/CentralDeNavegacaoEmpresa/Obras/AdicionarObra";

import EquipesEmCampo from "./components/company/CentralDeNavegacaoEmpresa/Profissionais/EquipesEmCampo";
import AdicionarProfissionalPage from "./components/company/CentralDeNavegacaoEmpresa/Profissionais/AdicionarProfissionalPage";
import FaltasPresencas from "./components/company/CentralDeNavegacaoEmpresa/Profissionais/FaltasPresencas";
import ProfissionalPerfil from "./components/company/CentralDeNavegacaoEmpresa/Profissionais/profissionais_base/ProfissionalPerfil";

import CustosMensais from "./components/company/CentralDeNavegacaoEmpresa/Relatorios/CustosMensais";
import Desempenho from "./components/company/CentralDeNavegacaoEmpresa/Relatorios/Desempenho";
import Financeiro from "./components/company/CentralDeNavegacaoEmpresa/Relatorios/Financeiro";

import Documentos from "./components/company/CentralDeNavegacaoEmpresa/Documentos/Documentos";

// ✅ Admin pages internas
import PedidosSection from "./components/admin/Admindashboard/PedidosSection";
// certo
import ProfissionalPerfilPage from "@/components/admin/ProfissionalPerfilPage";


/* ========= KILL SWITCH ========= */
if (typeof document !== "undefined") {
  document.documentElement.classList.add("no-anim");
}
/* =============================== */

function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <p style={{ textAlign: "center", marginTop: "40vh" }}>
        Carregando...
      </p>
    );
  }

  if (!isAuthenticated || !user) return <LoginPage />;

  // 👷 PROFISSIONAL
  if (user.tipo_usuario === "profissional") {
    return (
      <Routes>
        <Route path="/profissional/*" element={<ProfessionalDashboard />} />
        <Route index element={<Navigate to="/profissional" replace />} />
      </Routes>
    );
  }

  // 🏢 EMPRESA
  if (user.tipo_usuario === "empresa") {
    return (
      <Routes>
        <Route path="/empresa/*" element={<CompanyDashboard />}>
          {/* 🧾 Pedidos */}
          <Route path="pedidos/novos" element={<NovosPedidos />} />
          <Route path="pedidos/novo" element={<NovosPedidos />} />
          <Route path="pedidos/em-avaliacao" element={<EmAvaliacao />} />
          <Route path="pedidos/aprovados" element={<Aprovados />} />
          <Route
            path="pedidos"
            element={<Navigate to="/empresa/pedidos/em-avaliacao" replace />}
          />

          {/* 🏗️ Obras */}
          <Route path="obras" element={<ObrasPage />} />
          <Route path="obras/:id/detalhes" element={<DetalhesObraAtiva />} />
          <Route path="obras/:id" element={<DetalhesObraAtiva />} />
          <Route path="obras/ativas/:id" element={<DetalhesObraAtiva />} />
          <Route path="obras/ativas" element={<ObrasAtivas />} />
          <Route path="obras/historico" element={<Historico />} />
          <Route path="obras/adicionar" element={<AdicionarObra />} />

          {/* 👷‍♂️ Profissionais */}
          <Route path="profissionais" element={<Profissionais />} />
          <Route path="profissionais/base" element={<Profissionais />} />
          <Route path="profissionais/equipes" element={<EquipesEmCampo />} />
          <Route path="profissionais/adicionar" element={<AdicionarProfissionalPage />} />
          <Route path="profissionais/faltas" element={<FaltasPresencas />} />
          <Route path="profissionais/perfil/:id" element={<ProfissionalPerfil />} />

          {/* ✅ Detalhe alternativo */}
          <Route path="profissional/:id" element={<ProfissionalDetalhes />} />

          {/* 📊 Relatórios */}
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="relatorios/custos" element={<CustosMensais />} />
          <Route path="relatorios/desempenho" element={<Desempenho />} />
          <Route path="relatorios/financeiro" element={<Financeiro />} />

          {/* 📂 Documentos & Chat */}
          <Route path="documentos" element={<Documentos />} />
          <Route path="chat" element={<ChatComEquipa />} />

          {/* 👤 Perfil & 🔔 Notificações */}
          <Route path="perfil" element={<PerfilEmpresa />} />
          <Route path="notificacoes" element={<Notificacoes />} />

          <Route index element={<></>} />
        </Route>

        <Route path="/" element={<Navigate to="/empresa" replace />} />
        <Route path="*" element={<Navigate to="/empresa" replace />} />
      </Routes>
    );
  }

  // 🧑‍💼 ADMIN
  if (user.tipo_usuario === "admin") {
    if (user.email?.toLowerCase() === "mestre@acrobatas.com") {
      return <GabrielDashboard />;
    }
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />}>
          <Route index element={<Navigate to="pedidos" replace />} />
          <Route path="pedidos" element={<PedidosSection />} />
          {/* 🔥 Nova rota: Perfil do Profissional no Admin */}
          <Route path="profissionais/:usuarioId" element={<ProfissionalPerfilPage />} />
        </Route>

        {/* Fallbacks úteis */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  // 👷 MESTRE
  if (user.tipo_usuario === "mestre") return <MestreDashboard />;

  return <LoginPage />;
}

// 🌍 App principal
export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="always" transition={{ duration: 0 }}>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
