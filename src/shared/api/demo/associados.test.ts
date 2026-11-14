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

  it("cria um dependente válido e retorna o vínculo ao titular", async () => {
    const resposta = await demoAdapter({
      url: "/associados",
      method: "post",
      data: JSON.stringify({
        nome: "Mika Teste",
        numeroContato: "(11) 91234-5678",
        dataNascimento: "2010-03-20",
        tipo: "DEPENDENTE",
        titularId: 2,
      }),
    });

    expect(resposta.status).toBe(201);
    expect(resposta.data).toMatchObject({
      nome: "Mika Teste",
      tipo: "DEPENDENTE",
      titularId: 2,
      titularNome: "Maria Sato",
      anuidade: null,
    });
  });

  it("rejeita dependente sem titular", async () => {
    await expect(
      demoAdapter({
        url: "/associados",
        method: "post",
        data: JSON.stringify({
          nome: "Dependente Sem Titular",
          numeroContato: "(11) 91234-5678",
          dataNascimento: "2010-03-20",
          tipo: "DEPENDENTE",
        }),
      }),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: { mensagem: "Selecione o titular responsável." },
      },
    });
  });

  it("rejeita titular inválido para dependente", async () => {
    await expect(
      demoAdapter({
        url: "/associados",
        method: "post",
        data: JSON.stringify({
          nome: "Dependente de Dependente",
          numeroContato: "(11) 91234-5678",
          dataNascimento: "2010-03-20",
          tipo: "DEPENDENTE",
          titularId: 9,
        }),
      }),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: { mensagem: "Selecione o titular responsável." },
      },
    });
  });

  it("rejeita nome duplicado sem diferenciar caixa e acentos", async () => {
    await expect(
      demoAdapter({
        url: "/associados",
        method: "post",
        data: JSON.stringify({
          nome: "HÍROSHI TANAKA",
          numeroContato: "(11) 91234-5678",
          dataNascimento: "1952-03-14",
          tipo: "TITULAR",
        }),
      }),
    ).rejects.toMatchObject({
      response: {
        status: 409,
        data: { mensagem: "Já existe um associado com esse nome." },
      },
    });
  });

  it("impede titular com dependentes de virar dependente", async () => {
    await expect(
      demoAdapter({
        url: "/associados/1",
        method: "put",
        data: JSON.stringify({
          nome: "Hiroshi Tanaka",
          numeroContato: "(11) 91234-5601",
          dataNascimento: "1952-03-14",
          tipo: "DEPENDENTE",
          titularId: 2,
        }),
      }),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: {
          mensagem:
            "Este titular possui dependentes. Reatribua-os antes de alterar o tipo.",
        },
      },
    });
  });

  it("cria anuidade pendente para novo titular", async () => {
    const resposta = await demoAdapter({
      url: "/associados",
      method: "post",
      data: JSON.stringify({
        nome: "Aiko Nova",
        numeroContato: "(11) 91234-5679",
        dataNascimento: "1998-06-18",
        tipo: "TITULAR",
        titularId: 1,
      }),
    });

    expect(resposta.status).toBe(201);
    expect(resposta.data.anuidade).toMatchObject({
      valor: 150,
      totalPago: 0,
      status: "PENDENTE",
    });
  });
});
