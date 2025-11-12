// ==========================================
// statusUtils.ts — cálculo de validade e cor
// ==========================================

export function calcularStatusValidade(
  dataEnvio?: string,
  validadeMeses?: number | null
): { label: string; color: "emerald" | "amber" | "red" | "gray" } {
  if (!dataEnvio || !validadeMeses) {
    return { label: "Não enviado", color: "gray" };
  }

  const envio = new Date(dataEnvio);
  const agora = new Date();
  const expira = new Date(envio);
  expira.setMonth(expira.getMonth() + validadeMeses);

  const diffDias = Math.floor((expira.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias <= 0) {
    return { label: "Expirado", color: "red" };
  } else if (diffDias <= 30) {
    return { label: "A vencer", color: "amber" };
  } else {
    return { label: "Válido", color: "emerald" };
  }
}
