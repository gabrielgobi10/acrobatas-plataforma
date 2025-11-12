// =======================================
// 🤖 Utils - OCR (Leitura Automática)
// =======================================

import Tesseract from "tesseract.js";
import { OCRResult } from "../types/documentTypes";

// ================================
// 🔹 Expressões Regulares (Regex)
// ================================

// Detecção de datas nos formatos mais comuns: 15/11/2025, 2025-11-15, 15-11-25
const regexData =
  /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b)|(\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b)/g;

// Palavras que ajudam a identificar o nome do documento
const palavrasChaveDocumento = [
  "certidão permanente",
  "segurança social",
  "finanças",
  "seguro",
  "apólice",
  "mapa de remunerações",
  "recibo",
  "declaração",
  "imposto",
  "alvará",
];

// ====================================
// 🧠 Função principal de OCR automático
// ====================================

export async function processarOCR(
  arquivo: File
): Promise<OCRResult> {
  const resultado: OCRResult = {
    textoExtraido: "",
    dataValidade: undefined,
    nomeDetectado: undefined,
  };

  try {
    // 1️⃣ Lê o arquivo com Tesseract.js
    const ocr = await Tesseract.recognize(arquivo, "por", {
      logger: (m) => console.log(m),
    });

    const texto = ocr.data.text.toLowerCase();
    resultado.textoExtraido = texto;

    // 2️⃣ Busca por datas
    const datasEncontradas = texto.match(regexData);
    if (datasEncontradas && datasEncontradas.length > 0) {
      // Tenta pegar a última (geralmente a validade)
      resultado.dataValidade = normalizarData(datasEncontradas[datasEncontradas.length - 1]);
    }

    // 3️⃣ Busca pelo nome do documento
    for (const termo of palavrasChaveDocumento) {
      if (texto.includes(termo)) {
        resultado.nomeDetectado = capitalizar(termo);
        break;
      }
    }

    return resultado;
  } catch (erro) {
    console.error("Erro ao processar OCR:", erro);
    return resultado;
  }
}

// ==========================================
// 🧩 Funções auxiliares
// ==========================================

// Normaliza data encontrada em texto OCR (para ISO)
function normalizarData(dataTexto: string): string | undefined {
  try {
    const partes = dataTexto.split(/[-/.]/);
    if (partes.length === 3) {
      let [dia, mes, ano] = partes.map((p) => p.padStart(2, "0"));

      // Se o ano vier primeiro (ex: 2025-11-15)
      if (ano.length === 4 && Number(ano) > 1900) {
        return `${ano}-${mes}-${dia}`;
      }

      // Se o ano vier por último (ex: 15/11/2025)
      const anoCorrigido =
        ano.length === 2 ? `20${ano}` : ano.length === 4 ? ano : "2025";
      return `${anoCorrigido}-${mes}-${dia}`;
    }
  } catch {
    return undefined;
  }
}

// Capitaliza o nome do documento
function capitalizar(texto: string): string {
  return texto
    .split(" ")
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(" ");
}
