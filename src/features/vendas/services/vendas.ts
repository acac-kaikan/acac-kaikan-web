import api from "@/shared/api/cliente";
import { fimDoDiaISO, inicioDoDiaISO } from "@/features/eventos";
import type {
  CriarVendaPayload,
  ItemVendaPayload,
  ParametrosVendas,
  RespostaVendas,
  Venda,
  VendaDetalhe,
} from "../models";

interface PaginaApi<T> {
  itens: T[];
  page: number;
  size: number;
  totalItens: number;
  totalPaginas: number;
}

interface VendaApi {
  id: number;
  criadoEm: string;
  desconto: number;
  precoTotal: number;
  quantidadeItens: number;
  cancelada: boolean;
}

interface ItemVendaRequestApi {
  produtoEventoId: number;
  quantidade: number;
}

interface CriarVendaRequestApi {
  itens: ItemVendaRequestApi[];
  valorFinal?: number;
}

function paraVenda(item: VendaApi, eventId: number): Venda {
  return {
    id: item.id,
    eventId,
    criadoEm: item.criadoEm,
    desconto: item.desconto,
    precoTotal: item.precoTotal,
    quantidadeItens: item.quantidadeItens,
    cancelada: item.cancelada,
  };
}

function paraPaginado(pagina: PaginaApi<VendaApi>, eventId: number): RespostaVendas {
  return {
    items: pagina.itens.map((item) => paraVenda(item, eventId)),
    page: pagina.page + 1,
    pageSize: pagina.size,
    total: pagina.totalItens,
    totalPages: pagina.totalPaginas,
  };
}

function paraItensApi(itens: ItemVendaPayload[]): ItemVendaRequestApi[] {
  return itens.map((item) => ({
    produtoEventoId: item.produtoEventoId,
    quantidade: item.quantidade,
  }));
}

export async function listarVendas(
  params: ParametrosVendas,
): Promise<RespostaVendas> {
  if (!params.eventId) {
    return { items: [], page: 1, pageSize: params.pageSize || 8, total: 0, totalPages: 0 };
  }

  const { data } = await api.get<PaginaApi<VendaApi>>(
    `/eventos/${params.eventId}/vendas`,
    {
      params: {
        q: params.search || undefined,
        dataHoraInicio: params.from ? inicioDoDiaISO(params.from) : undefined,
        dataHoraFim: params.to ? fimDoDiaISO(params.to) : undefined,
        cancelada: params.cancelada,
        page: Math.max(0, (params.page || 1) - 1),
        size: params.pageSize || 8,
      },
    },
  );

  return paraPaginado(data, params.eventId);
}

export async function criarVenda(payload: CriarVendaPayload): Promise<void> {
  const corpo: CriarVendaRequestApi = {
    itens: paraItensApi(payload.itens),
    valorFinal: payload.valorFinal,
  };

  await api.post(`/eventos/${payload.eventId}/vendas`, corpo);
}

export async function detalharVenda(
  eventId: number,
  id: number,
): Promise<VendaDetalhe> {
  const { data } = await api.get<VendaDetalhe>(`/eventos/${eventId}/vendas/${id}`);
  return data;
}

export async function cancelarVenda(eventId: number, id: number): Promise<void> {
  await api.post(`/eventos/${eventId}/vendas/${id}/cancelamento`);
}

export async function aplicarDescontoProduto(
  eventId: number,
  produtoEventoId: number,
  novoPreco: number,
): Promise<void> {
  await api.patch(`/eventos/${eventId}/produtos/${produtoEventoId}/desconto`, {
    novoPreco,
  });
}

export async function removerDescontoProduto(
  eventId: number,
  produtoEventoId: number,
): Promise<void> {
  await api.delete(`/eventos/${eventId}/produtos/${produtoEventoId}/desconto`);
}
