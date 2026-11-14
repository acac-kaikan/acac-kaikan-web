// Contrato provisório: o backend ainda não implementa estes endpoints.
import api from "@/shared/api/cliente";
import type {
  AnuidadeAssociado,
  Associado,
  ParametrosAssociados,
  RespostaAssociados,
  SalvarAssociadoPayload,
} from "../models";

interface PaginaApi<T> {
  itens: T[];
  page: number;
  size: number;
  totalItens: number;
  totalPaginas: number;
}

interface AnuidadeAssociadoApi {
  id: number;
  valor: number;
  totalPago: number;
  status: AnuidadeAssociado["status"];
}

interface AssociadoApi {
  id: number;
  nome: string;
  numeroContato: string;
  dataNascimento: string;
  tipo: Associado["tipo"];
  titularId: number | null;
  titularNome: string | null;
  anuidade: AnuidadeAssociadoApi | null;
}

function paraAnuidadeAssociado(
  anuidade: AnuidadeAssociadoApi,
): AnuidadeAssociado {
  return {
    id: anuidade.id,
    valor: anuidade.valor,
    totalPago: anuidade.totalPago,
    status: anuidade.status,
  };
}

function paraAssociado(item: AssociadoApi): Associado {
  return {
    id: item.id,
    nome: item.nome,
    numeroContato: item.numeroContato,
    dataNascimento: item.dataNascimento,
    tipo: item.tipo,
    titularId: item.titularId,
    titularNome: item.titularNome,
    anuidade: item.anuidade ? paraAnuidadeAssociado(item.anuidade) : null,
  };
}

function paraPaginado(pagina: PaginaApi<AssociadoApi>): RespostaAssociados {
  return {
    items: pagina.itens.map(paraAssociado),
    page: pagina.page + 1,
    pageSize: pagina.size,
    total: pagina.totalItens,
    totalPages: pagina.totalPaginas,
  };
}

export async function listarAssociados(
  params: ParametrosAssociados,
): Promise<RespostaAssociados> {
  const { data } = await api.get<PaginaApi<AssociadoApi>>("/associados", {
    params: {
      q: params.search || undefined,
      page: Math.max(0, (params.page || 1) - 1),
      size: params.pageSize || 6,
      ano: params.ano,
      tipo: params.tipo,
      status: params.status,
      idadeMin: params.idadeMin,
      idadeMax: params.idadeMax,
    },
  });
  return paraPaginado(data);
}

export async function listarTitulares(): Promise<Associado[]> {
  const resposta = await listarAssociados({ tipo: "TITULAR", pageSize: 100 });
  return resposta.items;
}

export async function criarAssociado(
  payload: SalvarAssociadoPayload,
): Promise<Associado> {
  const { data } = await api.post<AssociadoApi>("/associados", payload);
  return paraAssociado(data);
}

export async function atualizarAssociado(
  id: number,
  payload: SalvarAssociadoPayload,
): Promise<Associado> {
  const { data } = await api.put<AssociadoApi>(
    `/associados/${id}`,
    payload,
  );
  return paraAssociado(data);
}
