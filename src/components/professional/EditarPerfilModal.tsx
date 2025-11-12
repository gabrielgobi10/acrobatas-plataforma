import { useState } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "../../lib/supabase"; // 🔗 ajusta conforme teu projeto

export default function EditarPerfilModal({ isOpen, onClose, user }: any) {
  const [formData, setFormData] = useState({
    nome: user?.nome || "",
    email: user?.email || "",
    telefone: user?.telefone || "",
    data_nascimento: user?.data_nascimento || "",
    nacionalidade: user?.nacionalidade || "",
    idiomas: user?.idiomas || "",
    area_principal: user?.area_principal || "",
    nivel: user?.nivel || "",
    experiencia: user?.experiencia || "",
    valor_diario: user?.valor_diario || "",
    tipo_contrato: user?.tipo_contrato || "",
    disponibilidade: user?.disponibilidade || "",
    cidade_base: user?.cidade_base || "",
    pode_viajar: user?.pode_viajar || "Sim",
    pode_alojamento: user?.pode_alojamento || "Sim",
    raio_deslocacao: user?.raio_deslocacao || "",
    habilidades: user?.habilidades || "",
  });

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("usuarios")
      .update(formData)
      .eq("uuid", user.uuid);

    setSaving(false);
    if (error) alert("Erro ao salvar alterações.");
    else {
      alert("Perfil atualizado com sucesso!");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white bg-gray-100 dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Editar Perfil Profissional
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={22} />
          </button>
        </div>

        {/* Corpo do formulário */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries({
            nome: "Nome Completo*",
            email: "Email*",
            telefone: "Telefone*",
            data_nascimento: "Data de Nascimento*",
            nacionalidade: "Nacionalidade*",
            idiomas: "Idiomas",
            area_principal: "Área Principal*",
            nivel: "Nível*",
            experiencia: "Anos de Experiência*",
            valor_diario: "Valor Diário (€)*",
            tipo_contrato: "Tipo de Contrato*",
            disponibilidade: "Disponibilidade*",
            cidade_base: "Cidade Base*",
            pode_viajar: "Pode Viajar?*",
            pode_alojamento: "Pode Alojamento?*",
            raio_deslocacao: "Raio de Deslocação (km)",
            habilidades: "Habilidades",
          }).map(([key, label]) => (
            <div key={key} className="flex flex-col">
              <label
                htmlFor={key}
                className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {label}
              </label>
              <input
                id={key}
                name={key}
                value={(formData as any)[key]}
                onChange={handleChange}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-4 p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-medium shadow hover:opacity-90 transition"
          >
            <Save size={16} className="inline mr-2" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
