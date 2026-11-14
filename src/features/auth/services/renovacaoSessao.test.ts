import { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import type { Sessao, TokensRenovados, Usuario } from "../models";
import type {
  DependenciasRenovacaoSessao,
  MotivoEncerramento,
} from "./renovacaoSessao";
import { renovarSessao } from "./renovacaoSessao";

const USUARIO: Usuario = {
  nome: "Administrador",
  cargo: "ADMINISTRADOR",
  permissoes: [],
};

function criarSessao(alteracoes: Partial<Sessao> = {}): Sessao {
  return {
    accessToken: "access-antigo",
    refreshToken: "refresh-antigo",
    usuario: USUARIO,
    ...alteracoes,
  };
}

function erroHttp(status: number) {
  return new AxiosError("falha", "ERR", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
    data: {},
  });
}

function montarCenario(inicial: Sessao | null) {
  let atual = inicial;

  const salvarSessao = vi.fn((sessao: Sessao) => {
    atual = sessao;
  });
  const definirToken = vi.fn();
  const encerrarSessao = vi.fn((_motivo: MotivoEncerramento) => {
    atual = null;
  });
  const renovarTokens = vi.fn(
    async (_refreshToken: string): Promise<TokensRenovados> => ({
      accessToken: "access-novo",
      refreshToken: "refresh-novo",
    }),
  );

  const deps: DependenciasRenovacaoSessao = {
    lerSessao: () => atual,
    salvarSessao,
    renovarTokens,
    definirToken,
    encerrarSessao,
  };

  return {
    deps,
    salvarSessao,
    definirToken,
    encerrarSessao,
    lerSessao: () => atual,
    definirSessao: (sessao: Sessao | null) => {
      atual = sessao;
    },
  };
}

describe("política de renovação da sessão", () => {
  it("persiste a rotação devolvida pelo refresh", async () => {
    const cenario = montarCenario(criarSessao());

    const token = await renovarSessao("access-antigo", cenario.deps);

    expect(token).toBe("access-novo");
    expect(cenario.deps.renovarTokens).toHaveBeenCalledWith("refresh-antigo");
    expect(cenario.salvarSessao).toHaveBeenCalledWith({
      accessToken: "access-novo",
      refreshToken: "refresh-novo",
      usuario: USUARIO,
    });
    expect(cenario.definirToken).toHaveBeenCalledWith("access-novo");
  });

  it("reaproveita o token quando outra requisição já renovou", async () => {
    const cenario = montarCenario(
      criarSessao({ accessToken: "access-novo" }),
    );

    const token = await renovarSessao("access-antigo", cenario.deps);

    expect(token).toBe("access-novo");
    expect(cenario.deps.renovarTokens).not.toHaveBeenCalled();
    expect(cenario.definirToken).toHaveBeenCalledWith("access-novo");
  });

  it("encerra a sessão quando o refresh responde 401", async () => {
    const cenario = montarCenario(criarSessao());
    cenario.deps.renovarTokens = vi.fn(async () => {
      throw erroHttp(401);
    });

    await expect(
      renovarSessao("access-antigo", cenario.deps),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(cenario.encerrarSessao).toHaveBeenCalledWith("expirada");
  });

  it("preserva a sessão em falha de rede", async () => {
    const cenario = montarCenario(criarSessao());
    cenario.deps.renovarTokens = vi.fn(async () => {
      throw new AxiosError("sem rede");
    });

    await expect(
      renovarSessao("access-antigo", cenario.deps),
    ).rejects.toThrow("sem rede");

    expect(cenario.encerrarSessao).not.toHaveBeenCalled();
    expect(cenario.lerSessao()).not.toBeNull();
  });

  it("preserva a sessão quando o refresh responde 5xx", async () => {
    const cenario = montarCenario(criarSessao());
    cenario.deps.renovarTokens = vi.fn(async () => {
      throw erroHttp(500);
    });

    await expect(
      renovarSessao("access-antigo", cenario.deps),
    ).rejects.toMatchObject({ response: { status: 500 } });

    expect(cenario.encerrarSessao).not.toHaveBeenCalled();
    expect(cenario.lerSessao()).not.toBeNull();
  });

  it("não restaura a sessão encerrada durante a renovação", async () => {
    const cenario = montarCenario(criarSessao());
    cenario.deps.renovarTokens = vi.fn(async () => {
      cenario.definirSessao(null);
      return { accessToken: "access-novo", refreshToken: "refresh-novo" };
    });

    await expect(
      renovarSessao("access-antigo", cenario.deps),
    ).rejects.toThrow("Sessão encerrada durante a renovação.");

    expect(cenario.salvarSessao).not.toHaveBeenCalled();
  });

  it("adota o token de outra aba quando ela vence a corrida do refresh", async () => {
    const cenario = montarCenario(criarSessao());
    cenario.deps.renovarTokens = vi.fn(async () => {
      cenario.definirSessao(
        criarSessao({
          accessToken: "access-outra-aba",
          refreshToken: "refresh-outra-aba",
        }),
      );
      throw erroHttp(401);
    });

    const token = await renovarSessao("access-antigo", cenario.deps);

    expect(token).toBe("access-outra-aba");
    expect(cenario.definirToken).toHaveBeenCalledWith("access-outra-aba");
    expect(cenario.encerrarSessao).not.toHaveBeenCalled();
  });

  it("encerra a sessão sem chamar o backend quando falta o refresh token", async () => {
    const cenario = montarCenario(criarSessao({ refreshToken: "" }));

    await expect(
      renovarSessao("access-antigo", cenario.deps),
    ).rejects.toThrow("Sessão sem refresh token.");

    expect(cenario.deps.renovarTokens).not.toHaveBeenCalled();
    expect(cenario.encerrarSessao).toHaveBeenCalledWith("expirada");
  });

  it("não marca sessão expirada quando já não existe sessão", async () => {
    const cenario = montarCenario(null);

    await expect(
      renovarSessao("access-antigo", cenario.deps),
    ).rejects.toThrow("Sessão ausente.");

    expect(cenario.deps.renovarTokens).not.toHaveBeenCalled();
    expect(cenario.encerrarSessao).not.toHaveBeenCalled();
  });
});
