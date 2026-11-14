import { createContext } from "react";
import type { Credenciais, Sessao, Usuario } from "../models";

export interface AutenticacaoContextoValor {
  usuario: Usuario | null;
  estaAutenticado: boolean;
  sessaoExpirada: boolean;
  entrar: (credenciais: Credenciais) => Promise<Sessao>;
  sair: () => void;
}

export const AutenticacaoContexto =
  createContext<AutenticacaoContextoValor | null>(null);
