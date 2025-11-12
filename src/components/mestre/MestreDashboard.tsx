import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PlusCircle, LogOut, KeyRound, ClipboardCopy } from "lucide-react";

export const MestreDashboard = () => {
  const { user, logout } = useAuth();
  const [codigos, setCodigos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarCodigos = async () => {
    const { data, error } = await supabase
      .from("codigos_convite")
      .select("*")
      .order("criado_em", { ascending: false });

    if (!error && data) setCodigos(data);
  };

  useEffect(() => {
    carregarCodigos();
  }, []);

  const gerarCodigo = async () => {
    setLoading(true);
    try {
      const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase
        .from("codigos_convite")
        .insert([{ codigo }]);

      if (error) throw error;

      alert(`✅ Código gerado com sucesso: ${codigo}`);
      await carregarCodigos();
    } catch (err: any) {
      alert("❌ Erro ao gerar código: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    alert(`📋 Código "${codigo}" copiado!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-blue-950 flex flex-col items-center justify-center text-white px-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight mb-2 drop-shadow-md">
          Painel do Mestre
        </h1>
        <p className="text-blue-300 text-lg">
          Bem-vindo, <span className="font-semibold">{user?.nome}</span>
        </p>
      </div>

      <div className="bg-white bg-gray-100/10 backdrop-blur-md border border-white/20 p-10 rounded-2xl shadow-2xl w-full max-w-2xl text-center">
        <div className="flex justify-center mb-6">
          <KeyRound className="w-12 h-12 text-blue-300 drop-shadow-sm" />
        </div>
        <p className="text-blue-100 text-base mb-8 leading-relaxed">
          Gere e visualize códigos de convite para novos administradores.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
          <button
            onClick={gerarCodigo}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <PlusCircle className="w-5 h-5" />
            {loading ? "Gerando..." : "Gerar Código"}
          </button>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 text-blue-300 hover:text-white transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sair do Painel
          </button>
        </div>

        {/* Tabela de códigos */}
        {codigos.length > 0 ? (
          <div className="bg-white bg-white/10 border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm text-blue-100">
              <thead className="bg-white dark:bg-zinc-900/10 uppercase text-xs text-blue-300">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {codigos.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-white/10 hover:bg-white dark:bg-zinc-900/5 transition"
                  >
                    <td className="px-4 py-3 font-mono">{c.codigo}</td>
                    <td className="px-4 py-3 text-center">
                      {c.usado ? "🔒 Usado" : "🟢 Ativo"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => copiarCodigo(c.codigo)}
                        className="text-blue-400 hover:text-blue-200 transition"
                      >
                        <ClipboardCopy className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-blue-400/70 text-sm">
            Nenhum código gerado ainda.
          </p>
        )}
      </div>

      <p className="mt-12 text-xs text-blue-400/60">
        © {new Date().getFullYear()} Acrobatas Workforce — acesso restrito
      </p>
    </div>
  );
};
