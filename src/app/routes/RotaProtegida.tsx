import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAutenticacao } from "@/features/auth";

export default function RotaProtegida() {
  const { estaAutenticado, sessaoExpirada } = useAutenticacao();
  const location = useLocation();

  if (!estaAutenticado) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, sessaoExpirada }}
      />
    );
  }

  return <Outlet />;
}
