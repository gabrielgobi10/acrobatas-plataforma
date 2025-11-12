// =======================================================
// ⬆️ UploadArea.tsx - Upload e OCR Automático (stub funcional)
// =======================================================

import { useState } from "react";

interface Props {
  onUploadConcluido: () => void;
}

export default function UploadArea({ onUploadConcluido }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    try {
      setLoading(true);
      // Simula sucesso de upload (substitua pelo seu supabase/storage se quiser)
      await new Promise((r) => setTimeout(r, 500));
      onUploadConcluido();
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border-2 border-dashed rounded-xl bg-white/70">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block mb-3"
      />
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Enviar"}
      </button>
    </div>
  );
}
