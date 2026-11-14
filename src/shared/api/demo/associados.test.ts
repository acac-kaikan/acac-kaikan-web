import { describe, expect, it } from "vitest";
import { demoAdapter } from "./adaptador";
import { filtrarAssociados, montarPaginaAssociados } from "./associados";
import { criarSeedAssociados } from "./dadosAssociados";

describe("demo associados", () => {
  const db = criarSeedAssociados();

  it("monta páginas com total de itens e páginas", () => {
    const pagina = montarPaginaAssociados(db, { page: 1, size: 5 });

    expect(pagina.page).toBe(1);
    expect(pagina.size).toBe(5);
    expect(pagina.totalItens).toBe(12);
    expect(pagina.totalPaginas).toBe(3);
    expect(pagina.itens).toHaveLength(5);
  });

  it("busca por nome sem diferenciar acentos", () => {
    const associados = filtrarAssociados(db, { q: "Joao" });

    expect(associados.map((associado) => associado.id)).toEqual([8, 12]);
  });

  it("busca pelo nome do titular sem diferenciar acentos", () => {
    const associados = filtrarAssociados(db, {
      q: "joao watanabe",
      tipo: "DEPENDENTE",
    });

    expect(associados.map((associado) => associado.id)).toEqual([12]);
  });

  it("filtra associados por tipo", () => {
    const associados = filtrarAssociados(db, { tipo: "DEPENDENTE" });

    expect(associados).toHaveLength(4);
    expect(associados.every((associado) => associado.tipo === "DEPENDENTE"))
      .toBe(true);
  });

  it("filtra pelo status da anuidade do ano consultado", () => {
    const associados = filtrarAssociados(db, {
      ano: 2026,
      status: "PENDENTE",
    });

    expect(associados.map((associado) => associado.id)).toEqual([3, 7, 4]);
    expect(associados.every((associado) => associado.anuidade?.status === "PENDENTE"))
      .toBe(true);
    expect(
      associados.find((associado) => associado.id === 4)?.anuidade?.totalPago,
    ).toBe(50);
  });

  it("filtra por faixa de idade", () => {
    const associados = filtrarAssociados(db, { idadeMin: 10, idadeMax: 15 });

    expect(associados.map((associado) => associado.id)).toEqual([9, 12]);
  });

  it("deixa a anuidade nula para dependentes", () => {
    const dependentes = filtrarAssociados(db, { tipo: "DEPENDENTE" });

    expect(dependentes.every((associado) => associado.anuidade === null)).toBe(
      true,
    );
  });

  it("roteia as chamadas GET para associados e configurações", async () => {
    const pagina = await demoAdapter({
      url: "/associados",
      method: "get",
      params: { page: 0, size: 2 },
    });
    const configuracoes = await demoAdapter({
      url: "/anuidades/configuracoes",
      method: "get",
    });

    expect(pagina.data).toMatchObject({
      page: 0,
      size: 2,
      totalItens: 12,
      totalPaginas: 6,
    });
    expect(configuracoes.data.map((item: { ano: number }) => item.ano)).toEqual([
      2026,
      2025,
    ]);
  });
});
