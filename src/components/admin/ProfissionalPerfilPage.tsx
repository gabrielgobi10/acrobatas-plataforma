import { useParams } from "react-router-dom";
import PerfilProfissional from "@/components/professional/PerfilProfissional";

export default function ProfissionalPerfilPage() {
  const { usuarioId } = useParams<{ usuarioId: string }>();
  return <PerfilProfissional adminView forceUsuarioId={usuarioId || ""} />;
}
