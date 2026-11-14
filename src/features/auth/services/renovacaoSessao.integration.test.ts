import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarCliente } from "@/shared/api/cliente";
import { demoAdapter } from "@/shared/api/demo/adaptador";
import { resetDb } from "@/shared/api/demo/store";
import type { Sessao, TokensRenovados } from "../models";
import { renovarSessao } from "./renovacaoSessao";

function expirar(token: string) {
  return token.replace(/-\d+-\d+$/, `-${Date.now() - 1000}-0`);
}

async function montarFluxo() {
  const cliente = criarCliente();
  cliente.api.defaults.adapter = demoAdapter;

  let sessao: Sessao | null = null;

  const renovarTokens = vi.fn(
    async (refreshToken: string): Promise<TokensRenovados> => {
      const { data } = await cliente.api.post<TokensRenovados>(
        "/auth/refresh",
        { refreshToken },
      );
      return data;
    },
  );

  cliente.definirRenovadorDeToken((tokenUsado) =>
    renovarSessao(tokenUsado, {
      lerSessao: () => sessao,
      salvarSessao: (renovada) => {
        sessao = renovada;
      },
      renovarTokens,
      definirToken: cliente.definirToken,
      encerrarSessao: () => {
        sessao = null;
        cliente.definirToken(null);
      },
    }),
  );

  const { data: login } = await cliente.api.post<Sessao>("/auth/login", {
    email: "demo@teste.com",
    senha: "senha-segura",
  });
  sessao = login;
  cliente.definirToken(login.accessToken);

  return {
    cliente,
    renovarTokens,
    login,
    lerSessao: () => sessao,
    definirSessao: (proxima: Sessao | null) => {
      sessao = proxima;
      cliente.definirToken(proxima?.accessToken ?? null);
    },
  };
}

beforeEach(() => {
  resetDb();
});

describe("fluxo completo de renovação no adaptador demo", () => {
  it("renova, persiste a rotação e repete a requisição original", async () => {
    const fluxo = await montarFluxo();

    const primeira = await fluxo.cliente.api.get("/products");
    expect(primeira.status).toBe(200);

    const tokenExpirado = expirar(fluxo.login.accessToken);
    fluxo.definirSessao({ ...fluxo.login, accessToken: tokenExpirado });

    const renovada = await fluxo.cliente.api.get("/products");
    const sessaoAtual = fluxo.lerSessao();

    expect(renovada.status).toBe(200);
    expect(fluxo.renovarTokens).toHaveBeenCalledTimes(1);
    expect(sessaoAtual?.accessToken).not.toBe(tokenExpirado);
    expect(sessaoAtual?.refreshToken).not.toBe(fluxo.login.refreshToken);
  });

  it("compartilha uma única renovação para requisições simultâneas", async () => {
    const fluxo = await montarFluxo();

    const tokenExpirado = expirar(fluxo.login.accessToken);
    fluxo.definirSessao({ ...fluxo.login, accessToken: tokenExpirado });

    const respostas = await Promise.all([
      fluxo.cliente.api.get("/products"),
      fluxo.cliente.api.get("/events"),
    ]);

    expect(respostas.map((resposta) => resposta.status)).toEqual([200, 200]);
    expect(fluxo.renovarTokens).toHaveBeenCalledTimes(1);
  });

  it("encerra a sessão quando o refresh token é inválido", async () => {
    const fluxo = await montarFluxo();

    const tokenExpirado = expirar(fluxo.login.accessToken);
    fluxo.definirSessao({
      ...fluxo.login,
      accessToken: tokenExpirado,
      refreshToken: "refresh-invalido",
    });

    await expect(
      fluxo.cliente.api.get("/products"),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(fluxo.lerSessao()).toBeNull();
  });
});
