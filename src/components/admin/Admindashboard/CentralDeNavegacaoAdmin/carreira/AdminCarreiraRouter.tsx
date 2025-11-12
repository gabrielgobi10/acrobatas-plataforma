// src/components/admin/Admindashboard/CentralDeNavegacaoAdmin/carreira/AdminCarreiraRouter.tsx

import RegrasNiveis from "./pages/RegrasNiveis";
import ProfissionaisProgresso from "./pages/ProfissionaisProgresso";
import ConfiguracoesAvancadas from "./pages/ConfiguracoesAvancadas";


export type CarreiraRoute =
  | "carreira-regras"
  | "carreira-regras-niveis"
  | "carreira-profissionais-progresso"
  | "carreira-config-avancadas";

/**
 * Normaliza rotas de carreira para garantir compatibilidade futura.
 */
function normalize(route: string): CarreiraRoute {
  switch (route) {
    case "carreira-regras":
    case "carreira-regras-niveis":
      return "carreira-regras-niveis";

    case "carreira-profissionais":
    case "carreira-profissionais-progresso":
      return "carreira-profissionais-progresso";

    case "carreira-config":
    case "carreira-config-avancadas":
      return "carreira-config-avancadas";

    default:
      return "carreira-regras-niveis";
  }
}

export default function AdminCarreiraRouter({
  active,
}: {
  active: CarreiraRoute | string;
}) {
  const key = normalize(active);

  switch (key) {
    case "carreira-regras-niveis":
      return <RegrasNiveis />;

    case "carreira-profissionais-progresso":
      return <ProfissionaisProgresso />;

    case "carreira-config-avancadas":
      return <ConfiguracoesAvancadas />;

    default:
      return <RegrasNiveis />;
  }
}
