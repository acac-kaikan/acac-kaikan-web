import { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import { criarCliente } from "./cliente";

function erro401(config: InternalAxiosRequestConfig) {
  return new AxiosError(
    "Não autenticado.",
    "ERR_UNAUTHORIZED",
    config,
    null,
    {
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
      data: { codigo: "NAO_AUTENTICADO", mensagem: "Não autenticado." },
    },
  );
}

function responder(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
) {
  return Promise.resolve({
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
  });
}

function autorizacao(config: InternalAxiosRequestConfig): string | null {
  const bruto = config.headers?.Authorization;
  return typeof bruto === "string" ? bruto : null;
}

describe("cliente HTTP com renovação de token", () => {
  it("renova o token e repete a requisição original uma única vez", async () => {
    const cliente = criarCliente();
    cliente.definirToken("antigo");

    const renovador = vi.fn(async () => "novo");
    cliente.definirRenovadorDeToken(renovador);

    const tentativas: (string | null)[] = [];
    cliente.api.defaults.adapter = (config) => {
      tentativas.push(autorizacao(config));
      if (autorizacao(config) === "Bearer antigo") {
        return Promise.reject(erro401(config));
      }
      return responder(config, { ok: true });
    };

    const resposta = await cliente.api.get("/products");

    expect(resposta.data).toEqual({ ok: true });
    expect(tentativas).toEqual(["Bearer antigo", "Bearer novo"]);
    expect(renovador).toHaveBeenCalledTimes(1);
    expect(renovador).toHaveBeenCalledWith("antigo");
  });

  it("compartilha uma única renovação entre 401s simultâneos", async () => {
    const cliente = criarCliente();
    cliente.definirToken("antigo");

    const renovador = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "novo";
    });
    cliente.definirRenovadorDeToken(renovador);

    cliente.api.defaults.adapter = (config) => {
      if (autorizacao(config) === "Bearer antigo") {
        return Promise.reject(erro401(config));
      }
      return responder(config, { ok: true });
    };

    const respostas = await Promise.all([
      cliente.api.get("/a"),
      cliente.api.get("/b"),
      cliente.api.get("/c"),
    ]);

    expect(respostas.map((resposta) => resposta.data)).toEqual([
      { ok: true },
      { ok: true },
      { ok: true },
    ]);
    expect(renovador).toHaveBeenCalledTimes(1);
  });

  it("não renova requisições das rotas de autenticação", async () => {
    const cliente = criarCliente();
    const renovador = vi.fn(async () => "novo");
    cliente.definirRenovadorDeToken(renovador);

    cliente.api.defaults.adapter = (config) =>
      Promise.reject(erro401(config));

    await expect(
      cliente.api.post("/auth/login", { email: "demo@teste.com" }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(renovador).not.toHaveBeenCalled();
  });

  it("não dispara uma segunda renovação quando a repetição também recebe 401", async () => {
    const cliente = criarCliente();
    cliente.definirToken("antigo");

    const renovador = vi.fn(async () => "novo");
    cliente.definirRenovadorDeToken(renovador);

    let tentativas = 0;
    cliente.api.defaults.adapter = (config) => {
      tentativas += 1;
      return Promise.reject(erro401(config));
    };

    await expect(cliente.api.get("/products")).rejects.toBeInstanceOf(
      AxiosError,
    );

    expect(tentativas).toBe(2);
    expect(renovador).toHaveBeenCalledTimes(1);
  });

  it("propaga o 401 quando nenhum renovador está registrado", async () => {
    const cliente = criarCliente();
    cliente.definirToken("antigo");

    cliente.api.defaults.adapter = (config) =>
      Promise.reject(erro401(config));

    await expect(cliente.api.get("/products")).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});
