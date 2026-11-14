import { beforeEach, describe, expect, it } from "vitest";
import { demoAdapter } from "./adaptador";
import { resetDb } from "./store";

interface OpcoesRequisicao {
  body?: unknown;
  token?: string;
}

function requisitar(
  metodo: string,
  url: string,
  opcoes: OpcoesRequisicao = {},
) {
  return demoAdapter({
    method: metodo,
    url,
    baseURL: "",
    data: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    headers: opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {},
  });
}

async function entrar(email = "demo@teste.com") {
  const resposta = await requisitar("post", "/auth/login", {
    body: { email, senha: "senha-segura" },
  });
  return resposta.data;
}

beforeEach(() => {
  resetDb();
});

describe("adaptador de demonstração", () => {
  it("responde ao login no contrato atual da API", async () => {
    const sessao = await entrar();

    expect(sessao.accessToken).toMatch(/^demo-access-/);
    expect(sessao.refreshToken).toMatch(/^demo-refresh-/);
    expect(sessao.usuario).toEqual({
      nome: "Administrador",
      cargo: "ADMINISTRADOR",
      permissoes: expect.arrayContaining(["EVENTOS_MENU", "CAIXA_MENU"]),
    });
  });

  it("exige um access token válido nas rotas protegidas", async () => {
    const sessao = await entrar();

    await expect(requisitar("get", "/products")).rejects.toMatchObject({
      response: { status: 401 },
    });

    const resposta = await requisitar("get", "/products", {
      token: sessao.accessToken,
    });
    expect(resposta.status).toBe(200);
  });

  it("renova o par de tokens quando o access token expirou", async () => {
    const sessao = await entrar();
    const tokenExpirado = sessao.accessToken.replace(
      /-\d+-\d+$/,
      `-${Date.now() - 1000}-0`,
    );

    await expect(
      requisitar("get", "/products", { token: tokenExpirado }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    const renovacao = await requisitar("post", "/auth/refresh", {
      body: { refreshToken: sessao.refreshToken },
    });

    expect(renovacao.data.accessToken).not.toBe(sessao.accessToken);
    expect(renovacao.data.refreshToken).not.toBe(sessao.refreshToken);

    const resposta = await requisitar("get", "/products", {
      token: renovacao.data.accessToken,
    });
    expect(resposta.status).toBe(200);
  });

  it("recusa refresh token inválido", async () => {
    await expect(
      requisitar("post", "/auth/refresh", {
        body: { refreshToken: "token-invalido" },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("responde ao logout com 204", async () => {
    const sessao = await entrar();

    const resposta = await requisitar("post", "/auth/logout", {
      body: { refreshToken: sessao.refreshToken },
    });

    expect(resposta.status).toBe(204);
  });
});
