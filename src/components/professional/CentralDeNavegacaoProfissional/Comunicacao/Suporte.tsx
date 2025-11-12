import { useState } from "react";
import { Send } from "lucide-react";

export default function Suporte() {
  const [mensagem, setMensagem] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) return;
    setEnviado(true);
    setMensagem("");
    setTimeout(() => setEnviado(false), 3000);
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-3">🆘 Suporte Técnico</h2>
      <p>
        Envie uma mensagem à equipa de suporte ou consulte as dúvidas mais
        frequentes sobre o uso da plataforma.
      </p>

      {/* 📬 Formulário de contato */}
      <form
        onSubmit={handleEnviar}
        className="mt-6 p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
      >
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Descreva sua dúvida ou problema:
        </label>
        <textarea
          className="w-full p-3 rounded-md border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
          rows={4}
          placeholder="Exemplo: Não consigo enviar documentos..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        ></textarea>

        <button
          type="submit"
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> Enviar Mensagem
        </button>

        {enviado && (
          <p className="mt-3 text-green-600 dark:text-green-400 text-sm">
            ✅ Sua mensagem foi enviada ao suporte! Entraremos em contato em breve.
          </p>
        )}
      </form>

      {/* 📚 FAQ */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
          Perguntas Frequentes (FAQ)
        </h3>
        <ul className="space-y-4">
          <li>
            <strong className="text-blue-600 dark:text-blue-400">
              • Como atualizar meus documentos?
            </strong>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vá até <b>Documentos → Meus Documentos</b> e clique em “Carregar Novo”.
              O sistema aceitará formatos PDF, JPG e PNG.
            </p>
          </li>
          <li>
            <strong className="text-blue-600 dark:text-blue-400">
              • Não consigo acessar o chat da equipa.
            </strong>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Verifique sua conexão ou tente atualizar a página. Se o problema
              persistir, envie uma mensagem acima.
            </p>
          </li>
          <li>
            <strong className="text-blue-600 dark:text-blue-400">
              • Como altero minha senha?
            </strong>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Acesse <b>Perfil → Configurações</b> e clique em “Alterar Senha”.
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}
