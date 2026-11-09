import api from "@/shared/api/cliente";
import type {
  Fiado,
  FormaPagamentoCaixa,
  ParametrosFiados,
  QuitarFiadoPayload,
  RespostaFiados,
} from "../models";

interface PaginaApi<T> {
  itens: T[];
  page: number;
  size: number;
  totalItens: number;
  totalPaginas: number;
}

interface FiadoApi {
  id: number;
  nomeDevedor: string;
  valor: number;
  observacoes?: string | null;
  quitado: boolean;
  quitadoEm?: string | null;
  formaPagamento?: FormaPagamentoCaixa | null;
  criadoEm: string;
}

interface QuitacaoApi {
  fiado: FiadoApi;
}

function mapearSituacaoApi(status?: string): string | undefined {
  if (!status) return undefined;
  if (status === "pending") return "pendente";
  if (status === "settled") return "quitado";
  return status;
}

function paraFiadoEvento(item: FiadoApi, eventId: number): Fiado {
  const quitado = item.quitado;
  const paidAmount = quitado ? item.valor : 0;
  const remaining = quitado ? 0 : item.valor;

  return {
    id: item.id,
    eventId,
    nomeDevedor: item.nomeDevedor,
    valor: item.valor,
    observacoes: item.observacoes ?? null,
    quitado,
    quitadoEm: item.quitadoEm ?? null,
    formaPagamento: item.formaPagamento ?? null,
    criadoEm: item.criadoEm,

    // Compatibilidade
    amount: item.valor,
    paidAmount,
    remaining,
    status: quitado ? "settled" : "pending",
    situationLabel: quitado ? "Quitado" : "Pendente",
    debtorName: item.nomeDevedor,
    createdAt: item.criadoEm,
  };
}

function paraPaginadoFiados(
  pagina: PaginaApi<FiadoApi>,
  eventId: number,
): RespostaFiados {
  const items = pagina.itens.map((item) => paraFiadoEvento(item, eventId));
  const pendentes = items.filter((fiado) => fiado.status === "pending");

  return {
    items,
    page: pagina.page + 1,
    pageSize: pagina.size,
    total: pagina.totalItens,
    totalPages: pagina.totalPaginas,
    pendingCount: pendentes.length,
    openAmount: pendentes.reduce((acc, fiado) => acc + fiado.remaining, 0),
  };
}

export async function listarFiados(
  params: ParametrosFiados,
): Promise<RespostaFiados> {
  if (params.eventId) {
    const { data } = await api.get<PaginaApi<FiadoApi>>(
      `/eventos/${params.eventId}/fiados`,
      {
        params: {
          situacao: mapearSituacaoApi(params.status),
          page: Math.max(0, (params.page || 1) - 1),
          size: params.pageSize || 6,
        },
      },
    );

    return paraPaginadoFiados(data, params.eventId);
  }

  // Fluxo legado (fiados gerais / relatórios)
  const { data } = await api.get<RespostaFiados>("/fiados", { params });
  return data;
}

export async function listarFiadosEvento(
  eventId: number,
  situacao?: string,
): Promise<Fiado[]> {
  const pageSize = 100;
  let page = 0;
  let totalPages = 1;
  const items: Fiado[] = [];

  while (page < totalPages) {
    const { data } = await api.get<PaginaApi<FiadoApi>>(
      `/eventos/${eventId}/fiados`,
      {
        params: {
          situacao: situacao || undefined,
          page,
          size: pageSize,
        },
      },
    );
    items.push(...data.itens.map((item) => paraFiadoEvento(item, eventId)));
    totalPages = Math.max(1, data.totalPaginas);
    page += 1;
  }

  return items;
}

export async function quitarFiado(
  id: string,
  payload: QuitarFiadoPayload,
): Promise<Fiado> {
  // Fluxo legado fora do escopo da integração de evento-atual.
  const { data } = await api.post<Fiado>(`/fiados/${id}/settle`, payload);
  return data;
}

export async function quitarFiadoEvento(
  eventId: number,
  id: number,
  payload: QuitarFiadoPayload,
): Promise<Fiado> {
  const { data } = await api.patch<QuitacaoApi>(
    `/eventos/${eventId}/fiados/${id}/quitacao`,
    {
      formaPagamento: payload.formaPagamento,
    },
  );

  return paraFiadoEvento(data.fiado, eventId);
}

export async function desquitarFiado(id: string): Promise<Fiado> {
  // Fluxo legado fora do escopo da integração de evento-atual.
  const { data } = await api.patch<Fiado>(`/fiados/${id}/unsettle`);
  return data;
}
