import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import { Toaster } from "react-hot-toast";

// 🔹 Login
import { LoginPage } from "./components/LoginPage";

// 🏢 Empresa
import CompanyDashboard from "./components/company/CompanyDashboard";
import ObrasPage from "./components/company/Obras";
import DetalhesObra from "./components/company/DetalhesObra"; // (mantido caso ainda use)
import DetalhesObraAtiva from "./components/company/DetalhesObraAtiva";
import Profissionais from "./components/company/Profissionais";
import Relatorios from "./components/company/Relatorios";
import ChatComEquipa from "./components/company/ChatComEquipa";

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

// =====================================================

function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 🔎 Teste básico de conexão
  useEffect(() => {
    async function testarConexao() {
      const { data, error } = await supabase.from("usuarios").select("*");
      console.log("🧠 TESTE SUPABASE - DATA:", data);
      console.log("🧠 TESTE SUPABASE - ERROR:", error);
    }
    testarConexao();
  }, []);

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "40vh" }}>Carregando...</p>;
  }

  // 🔐 Login se não autenticado
  if (!isAuthenticated || !user) return <LoginPage />;

  // 👷 PROFISSIONAL
  if (user.tipo_usuario === "profissional") {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/profissional/*" element={<ProfessionalDashboard />} />
          <Route index element={<Navigate to="/profissional" replace />} />
        </Routes>
      </>
    );
  }

  // 🏢 EMPRESA
  if (user.tipo_usuario === "empresa") {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/empresa" element={<CompanyDashboard />}>
            {/* Pedidos */}
            <Route path="pedidos/novos" element={<NovosPedidos />} />
            <Route path="pedidos/em-avaliacao" element={<EmAvaliacao />} />
            <Route path="pedidos/aprovados" element={<Aprovados />} />

            {/* Obras */}
            <Route path="obras" element={<ObrasPage />} />

            {/* ✅ Caminho canônico para detalhes */}
            <Route path="obras/:id/detalhes" element={<DetalhesObraAtiva />} />

            {/* ✅ Aliases/compat: ambos abrem o mesmo detalhe */}
            <Route path="obras/:id" element={<DetalhesObraAtiva />} />
            <Route path="obras/ativas/:id" element={<DetalhesObraAtiva />} />

            <Route path="obras/ativas" element={<ObrasAtivas />} />
            <Route path="obras/historico" element={<Historico />} />
            <Route path="obras/adicionar" element={<AdicionarObra />} />

            {/* Profissionais */}
            <Route path="profissionais" element={<Profissionais />} />
            <Route path="profissionais/equipes" element={<EquipesEmCampo />} />
            <Route path="profissionais/adicionar" element={<AdicionarProfissionalPage />} />
            <Route path="profissionais/faltas" element={<FaltasPresencas />} />
            <Route path="profissionais/perfil/:id" element={<ProfissionalPerfil />} />

            {/* Relatórios */}
            <Route path="relatorios/custos" element={<CustosMensais />} />
            <Route path="relatorios/desempenho" element={<Desempenho />} />
            <Route path="relatorios/financeiro" element={<Financeiro />} />

            {/* Documentos e Chat */}
            <Route path="documentos" element={<Documentos />} />
            <Route path="chat" element={<ChatComEquipa />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<CompanyDashboard />} />
        </Routes>
      </>
    );
  }

  // 🧑‍💼 ADMIN
  if (user.tipo_usuario === "admin") {
    if (user.email?.toLowerCase() === "mestre@acrobatas.com") {
      return <GabrielDashboard />;
    }
    return (
      <>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <AdminDashboard />
      </>
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
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
