import api from "@/shared/api/cliente";
import type {
  Credenciais,
  RedefinirSenhaPayload,
  Sessao,
  TokensRenovados,
} from "../models";

export async function entrar(credenciais: Credenciais): Promise<Sessao> {
  const { data } = await api.post<Sessao>("/auth/login", credenciais);
  return data;
}

export async function renovarTokens(
  refreshToken: string,
): Promise<TokensRenovados> {
  const { data } = await api.post<TokensRenovados>("/auth/refresh", {
    refreshToken,
  });
  return data;
}

export async function solicitarRecuperacaoSenha(
  email: string,
): Promise<void> {
  const { data } = await api.post<void>("/auth/recuperacao-senha", {
    email,
  });
  return data;
}

export async function redefinirSenha(
  payload: RedefinirSenhaPayload,
): Promise<void> {
  const { data } = await api.post<void>(
    "/auth/redefinicao-senha",
    payload,
  );
  return data;
}

export async function sair(refreshToken: string): Promise<void> {
  await api.post<void>("/auth/logout", {
    refreshToken
  });
}
