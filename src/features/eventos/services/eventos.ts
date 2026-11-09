import api from "@/shared/api/cliente";
import type { Paginado, ParametrosPaginacao } from "@/shared/models/paginacao";
import type {
  AdicionarProdutoCardapioPayload,
  AtualizarCustoEventoPayload,
  AtualizarEventoPayload,
  AtualizarProdutoCardapioPayload,
  CriarCustoEventoPayload,
  CriarEventoPayload,
  CustoEvento,
  Evento,
  EventoDetalhe,
  ItemCardapio,
  ParametrosEventos,
  RelatorioEventoResponse,
  RespostaCardapio,
  RespostaEventos,
} from "../models";
import { fimDoDiaISO, inicioDoDiaISO } from "../utils/datas";

interface PaginaApi<T> {
  itens: T[];
  page: number;
  size: number;
  totalItens: number;
  totalPaginas: number;
}

interface ParametrosCardapio extends ParametrosPaginacao {
  search?: string;
  category?: string;
}

const STATUS_ID: Record<string, number> = {
  NAO_INICIADO: 1,
  EM_ANDAMENTO: 2,
  ENCERRADO: 3,
};

function paraPaginado<T>(pagina: PaginaApi<T>): Paginado<T> {
  return {
    items: pagina.itens,
    page: pagina.page + 1,
    pageSize: pagina.size,
    total: pagina.totalItens,
    totalPages: pagina.totalPaginas,
  };
}

function separar(valor?: string): string[] {
  return valor
    ? valor
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function primeiroStatusId(statuses?: string): number | undefined {
  const status = separar(statuses)[0];
  return status ? STATUS_ID[status] : undefined;
}

function primeiroTipo(types?: string): string | undefined {
  return separar(types)[0];
}

export async function listarEventos(
  params: ParametrosEventos,
): Promise<RespostaEventos> {
  const { data } = await api.get<PaginaApi<Evento>>("/eventos", {
    params: {
      q: params.search || undefined,
      dataInicio: params.from ? inicioDoDiaISO(params.from) : undefined,
      dataFim: params.to ? fimDoDiaISO(params.to) : undefined,
      statusId: primeiroStatusId(params.statuses),
      tipoEvento: primeiroTipo(params.types),
      page: Math.max(0, (params.page || 1) - 1),
      size: params.pageSize || 8,
    },
  });
  return paraPaginado(data);
}

export async function obterEventoAtual(): Promise<Evento | null> {
  const { data } = await api.get<PaginaApi<Evento>>("/eventos", {
    params: { statusId: 2, tipoEvento: "EVENTO", page: 0, size: 1 },
  });
  return data.itens[0] ?? null;
}

export async function obterEvento(id: number): Promise<EventoDetalhe> {
  const { data } = await api.get<EventoDetalhe>(`/eventos/${id}`);
  return data;
}

export async function criarEvento(
  payload: CriarEventoPayload,
): Promise<Evento> {
  const { data } = await api.post<Evento>("/eventos", payload);
  return data;
}

export async function atualizarEvento(
  id: number,
  payload: AtualizarEventoPayload,
): Promise<Evento> {
  const { data } = await api.put<Evento>(`/eventos/${id}`, payload);
  return data;
}

export async function alterarStatusEvento(
  id: number,
  statusId: number,
): Promise<void> {
  await api.patch(`/eventos/${id}`, { status: statusId });
}

export async function obterRelatorioEvento(
  id: number,
): Promise<RelatorioEventoResponse> {
  const { data } = await api.get<RelatorioEventoResponse>(
    `/eventos/${id}/relatorio`,
  );
  return data;
}

export async function excluirEvento(id: number): Promise<{ ok: boolean }> {
  const { data } = await api.delete<{ ok: boolean }>(`/eventos/${id}`);
  return data;
}

export async function criarCustoEvento(
  eventoId: number,
  payload: CriarCustoEventoPayload,
): Promise<CustoEvento> {
  const { data } = await api.post<CustoEvento>(`/eventos/${eventoId}/custos`, payload);
  return data;
}

export async function atualizarCustoEvento(
  eventoId: number,
  custoId: string,
  payload: AtualizarCustoEventoPayload,
): Promise<CustoEvento> {
  const { data } = await api.put<CustoEvento>(
    `/eventos/${eventoId}/custos/${custoId}`,
    payload,
  );
  return data;
}

export async function excluirCustoEvento(
  eventoId: number,
  custoId: string,
): Promise<void> {
  await api.delete<void>(`/eventos/${eventoId}/custos/${custoId}`);
}

export async function listarProdutosEvento(
  id: number,
): Promise<ItemCardapio[]> {
  const pageSize = 100;
  let page = 0;
  let totalPages = 1;
  const items: ItemCardapio[] = [];

  while (page < totalPages) {
    const { data } = await api.get<PaginaApi<ItemCardapio>>(
      `/eventos/${id}/produtos`,
      {
        params: { page, size: pageSize },
      },
    );
    items.push(...data.itens);
    totalPages = Math.max(1, data.totalPaginas);
    page += 1;
  }

  return items;
}

export async function obterCardapioEvento(
  id: number,
  params?: ParametrosCardapio,
): Promise<RespostaCardapio> {
  if (!params) {
    const [produtos, categorias] = await Promise.all([
      listarProdutosEvento(id),
      api.get<string[]>(`/eventos/${id}/produtos/categorias`),
    ]);

    return {
      items: produtos,
      categories: categorias.data,
      page: 1,
      pageSize: Math.max(1, produtos.length),
      total: produtos.length,
      totalPages: 1,
    };
  }

  const [produtos, categorias] = await Promise.all([
    api.get<PaginaApi<ItemCardapio>>(`/eventos/${id}/produtos`, {
      params: {
        q: params?.search || undefined,
        categoria: params?.category || undefined,
        page: Math.max(0, (params?.page || 1) - 1),
        size: params?.pageSize || 8,
      },
    }),
    api.get<string[]>(`/eventos/${id}/produtos/categorias`),
  ]);

  return {
    ...paraPaginado(produtos.data),
    categories: categorias.data,
  };
}

export async function adicionarProdutoCardapio(
  id: number,
  payload: AdicionarProdutoCardapioPayload,
): Promise<ItemCardapio> {
  const { data } = await api.post<ItemCardapio>(
    `/eventos/${id}/produtos`,
    payload,
  );
  return data;
}

export async function atualizarProdutoCardapio(
  eventId: number,
  itemId: number,
  payload: AtualizarProdutoCardapioPayload,
): Promise<ItemCardapio> {
  const { data } = await api.put<ItemCardapio>(
    `/eventos/${eventId}/produtos/${itemId}`,
    payload,
  );
  return data;
}

export async function excluirProdutoCardapio(
  eventId: number,
  itemId: number,
): Promise<void> {
  await api.delete(`/eventos/${eventId}/produtos/${itemId}`);
}

export async function enviarFotoProdutoCardapio(
  eventId: number,
  itemId: number,
  arquivo: File,
): Promise<string> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);

  const { data } = await api.post<{ url: string }>(
    `/eventos/${eventId}/produtos/${itemId}/foto`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.url;
}
