// src/components/admin/Admindashboard/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { LayoutDashboard, LogOut, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";

import SidebarDockAdmin from "./SidebarDockAdmin";

// Seções padrão
import PainelSection from "./PainelSection";
import UsuariosSection from "./UsuariosSection";
import PedidosSection from "./PedidosSection";
import RelatoriosSection from "./RelatoriosSection";
import SuporteSection from "./SuporteSection";

// Lazy para módulos pesados
const DocumentosAcrobatasAdmin = React.lazy(async () => {
  const module = await import(
    "./CentralDeNavegacaoAdmin/Documentos/DocumentosAcrobatasAdmin"
  );
  return { default: module.default || module.DocumentosAcrobatasAdmin };
});

// 🔹 Roteador da aba Carreira
const AdminCarreiraRouter = React.lazy(async () => {
  const module = await import(
    "./CentralDeNavegacaoAdmin/carreira/AdminCarreiraRouter"
  );
  return { default: module.default || module.AdminCarreiraRouter };
});

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState<string>("painel");
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // estado do sidebar (para mobile/desktop)
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("administradores")
        .select("nome, email")
        .eq("email", user?.email)
        .maybeSingle();
      setProfile(data);
    };
    fetchProfile();
  }, [user?.email]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Detecta se a seção é do grupo “Carreira”
  const isCarreira = useMemo(() => section.startsWith("carreira-"), [section]);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#eef2f8] to-[#f8fafc] text-gray-800">
      {/* Sidebar */}
      <SidebarDockAdmin
        onSelectSection={setSection}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1">
        {/* ===== HEADER ===== */}
        <header className="sticky top-0 z-40 bg-white shadow-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-7 h-7 text-blue-600" />
              <div>
                <h1 className="font-bold text-lg">Painel Administrativo</h1>
                <p className="text-sm text-gray-500">
                  {profile?.email || user?.email}
                </p>
              </div>
            </div>

            {/* Navegação topo (atalhos) */}
            <nav className="hidden md:flex gap-6 font-medium text-gray-600">
              {["painel", "usuarios", "pedidos", "relatorios", "suporte"].map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setSection(key)}
                    className={`capitalize ${
                      section === key
                        ? "text-blue-600 font-semibold"
                        : "hover:text-blue-600"
                    }`}
                  >
                    {key}
                  </button>
                )
              )}
            </nav>

            {/* Ações topo */}
            <div className="flex items-center gap-5 relative">
              {/* Notificações */}
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 rounded-full hover:bg-gray-100 bg-white transition"
                aria-label="Notificações"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
              </button>

              {/* Dropdown de notificações */}
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 bg-white border border-gray-200 shadow-xl rounded-xl w-80 overflow-hidden z-50"
                >
                  <div className="px-4 py-2 font-semibold text-gray-700 border-b bg-gray-50">
                    Notificações
                  </div>
                  <ul>
                    <li className="px-4 py-3 hover:bg-gray-50 text-sm">
                      🟢 Novo profissional registrado.
                    </li>
                    <li className="px-4 py-3 hover:bg-gray-50 text-sm">
                      🧾 Novo relatório disponível.
                    </li>
                    <li className="px-4 py-3 hover:bg-gray-50 text-sm">
                      ⚠️ Pedido aguardando aprovação.
                    </li>
                  </ul>
                </motion.div>
              )}

              {/* Info do admin */}
              <div className="flex flex-col text-right">
                <span className="font-semibold text-sm">
                  {profile?.nome || "Administrador"}
                </span>
                <span className="text-xs text-green-500">Ativo</span>
              </div>

              {/* Botão sair */}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </header>

        {/* ===== CONTEÚDO DINÂMICO ===== */}
        <main className="max-w-7xl mx-auto p-8 space-y-10">
          {!isCarreira && section === "painel" && <PainelSection />}
          {!isCarreira && section === "usuarios" && <UsuariosSection />}
          {!isCarreira && section === "pedidos" && <PedidosSection />}
          {!isCarreira && section === "relatorios" && <RelatoriosSection />}
          {!isCarreira && section === "suporte" && <SuporteSection />}

          {/* 🔹 CARREIRA – roteador dedicado (passa a seção completa) */}
          {isCarreira && (
            <React.Suspense
              fallback={
                <div className="text-center text-gray-500 p-8">
                  Carregando Carreira...
                </div>
              }
            >
              {/* AdminCarreiraRouter espera a chave completa, ex: "carreira-regras" */}
              <AdminCarreiraRouter active={section as any} />
            </React.Suspense>
          )}

          {/* 🔹 Documentos da Acrobatas */}
          {!isCarreira && section === "documentos-acrobatas" && (
            <div className="animate-fadeIn">
              <div className="bg-white rounded-xl shadow p-4">
                <React.Suspense
                  fallback={
                    <div className="text-center text-gray-500 p-8">
                      Carregando documentos...
                    </div>
                  }
                >
                  <DocumentosAcrobatasAdmin />
                </React.Suspense>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
