import { isAxiosError } from "axios";
import type { Sessao, TokensRenovados } from "../models";

export type MotivoEncerramento = "expirada" | "manual";

export interface DependenciasRenovacaoSessao {
  lerSessao: () => Sessao | null;
  salvarSessao: (sessao: Sessao) => void;
  renovarTokens: (refreshToken: string) => Promise<TokensRenovados>;
  definirToken: (token: string | null) => void;
  encerrarSessao: (motivo: MotivoEncerramento) => void;
}

function falhaDefinitiva(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

export async function renovarSessao(
  tokenUsado: string | null,
  deps: DependenciasRenovacaoSessao,
): Promise<string> {
  const sessao = deps.lerSessao();

  if (!sessao) {
    throw new Error("Sessão ausente.");
  }

  if (!sessao.refreshToken) {
    deps.encerrarSessao("expirada");
    throw new Error("Sessão sem refresh token.");
  }

  if (tokenUsado && sessao.accessToken !== tokenUsado) {
    deps.definirToken(sessao.accessToken);
    return sessao.accessToken;
  }

  let tokens: TokensRenovados;
  try {
    tokens = await deps.renovarTokens(sessao.refreshToken);
  } catch (error) {
    const atual = deps.lerSessao();
    if (atual && atual.accessToken !== sessao.accessToken) {
      deps.definirToken(atual.accessToken);
      return atual.accessToken;
    }
    if (falhaDefinitiva(error)) {
      deps.encerrarSessao("expirada");
    }
    throw error;
  }

  const atual = deps.lerSessao();
  if (!atual || atual.refreshToken !== sessao.refreshToken) {
    throw new Error("Sessão encerrada durante a renovação.");
  }

  const renovada: Sessao = { ...atual, ...tokens };
  deps.salvarSessao(renovada);
  deps.definirToken(renovada.accessToken);
  return renovada.accessToken;
}
