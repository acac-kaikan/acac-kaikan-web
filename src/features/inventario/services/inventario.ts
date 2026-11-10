import api from "@/shared/api/cliente";
import { resolverUrlApi } from "@/shared/api/urls";
import type { Paginado, ParametrosPaginacao } from "@/shared/models/paginacao";
import type {
  AtualizarProdutoPayload,
  Categoria,
  CriarMovimentacaoPayload,
  CriarProdutoPayload,
  LoteProduto,
  MovimentacaoProduto,
  MovimentacaoResultado,
  PaginaApi,
  ParametrosProdutos,
  Produto,
  RespostaProdutos,
  TipoMovimentacao,
} from "../models";

interface ProdutoResponseApi {
  id: number;
  nome: string;
  descricao?: string | null;
  categoria?: { id: number; nome: string } | null;
  fotoUrl?: string | null;
  quantidadeAtual: number;
  estoqueMinimo?: number | null;
}

interface LoteResponseApi {
  id: number;
  quantidadeInicial: number;
  quantidadeAtual: number;
  custoUnitario: number;
  custoTotal: number;
  criadoEm: string;
}

interface MovimentacaoResponseApi {
  id: number;
  estoqueId: number;
  tipo: string;
  quantidade: number;
  custoTotal: number;
  custoUnitario: number;
  eventoId?: number | null;
  eventoNome?: string | null;
  observacoes?: string | null;
  criadoEm: string;
}

interface MovimentacaoResultadoApi {
  movimentacoes: MovimentacaoResponseApi[];
  quantidadeAtual: number;
}

function normalizarProduto(apiProduto: ProdutoResponseApi): Produto {
  return {
    id: apiProduto.id,
    nome: apiProduto.nome,
    descricao: apiProduto.descricao,
    categoria: apiProduto.categoria,
    fotoUrl: resolverUrlApi(apiProduto.fotoUrl),
    quantidadeAtual: Number(apiProduto.quantidadeAtual) || 0,
    estoqueMinimo:
      apiProduto.estoqueMinimo === null || apiProduto.estoqueMinimo === undefined
        ? null
        : Number(apiProduto.estoqueMinimo),
  };
}

function normalizarLote(apiLote: LoteResponseApi): LoteProduto {
  return {
    id: apiLote.id,
    quantidadeInicial: Number(apiLote.quantidadeInicial) || 0,
    quantidadeAtual: Number(apiLote.quantidadeAtual) || 0,
    custoTotal: Number(apiLote.custoTotal) || 0,
    custoUnitario: Number(apiLote.custoUnitario) || 0,
    criadoEm: apiLote.criadoEm,
  };
}

function normalizarMovimentacao(
  apiMovimentacao: MovimentacaoResponseApi,
): MovimentacaoProduto {
  return {
    id: apiMovimentacao.id,
    estoqueId: apiMovimentacao.estoqueId,
    type: apiMovimentacao.tipo,
    quantidade: Number(apiMovimentacao.quantidade) || 0,
    custoTotal: Number(apiMovimentacao.custoTotal) || 0,
    custoUnitario: Number(apiMovimentacao.custoUnitario) || 0,
    eventoId: apiMovimentacao.eventoId,
    eventoNome: apiMovimentacao.eventoNome,
    observacoes: apiMovimentacao.observacoes,
    criadoEm: apiMovimentacao.criadoEm,
  };
}

function filtrarPorEstoque(items: Produto[], stock?: string) {
  if (!stock) return items;
  return items.filter((item) => {
    const minimo = Number(item.estoqueMinimo ?? 0);
    if (stock === "low") {
      return item.estoqueMinimo !== null && item.estoqueMinimo !== undefined
        ? item.quantidadeAtual <= minimo
        : false;
    }
    if (stock === "out") return item.quantidadeAtual === 0;
    if (stock === "ok") {
      if (item.quantidadeAtual === 0) return false;
      if (item.estoqueMinimo === null || item.estoqueMinimo === undefined) {
        return true;
      }
      return item.quantidadeAtual > minimo;
    }
    return true;
  });
}

function paginar<T>(items: T[], page = 1, pageSize = 6): Paginado<T> {
  const pagina = Math.max(1, page || 1);
  const tamanho = Math.max(1, pageSize || 6);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / tamanho));
  const offset = (pagina - 1) * tamanho;
  return {
    items: items.slice(offset, offset + tamanho),
    page: pagina,
    pageSize: tamanho,
    total,
    totalPages,
  };
}

function paraPaginado<I, O>(
  pagina: PaginaApi<I>,
  mapItem: (item: I) => O,
): Paginado<O> {
  return {
    items: pagina.itens.map(mapItem),
    page: pagina.page + 1,
    pageSize: pagina.size,
    total: pagina.totalItens,
    totalPages: pagina.totalPaginas,
  };
}

export async function listarProdutos(
  params: ParametrosProdutos,
): Promise<RespostaProdutos> {
  const { data } = await api.get<ProdutoResponseApi[]>("/produtos", {
    params: {
      q: params.search || undefined,
      categoriaId: params.categoryIds
        ? params.categoryIds
            .split(",")
            .map((item) => Number(item))
            .filter(Number.isFinite)
        : params.categoryId
          ? [params.categoryId]
          : undefined,
      abaixoDoMinimo: params.stock === "low" ? true : undefined,
    },
  });

  const normalizados = data.map(normalizarProduto);
  const filtrados = filtrarPorEstoque(normalizados, params.stock);
  const ordenados = [...filtrados].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  return paginar(ordenados, params.page, params.pageSize);
}

export async function listarLotesProduto(produtoId: number): Promise<LoteProduto[]> {
  const { data } = await api.get<LoteResponseApi[]>(`/produtos/${produtoId}/estoques`);
  return data.map(normalizarLote);
}

export async function listarMovimentacoesProduto(
  produtoId: number,
  params: ParametrosPaginacao,
): Promise<Paginado<MovimentacaoProduto>> {
  const { data } = await api.get<PaginaApi<MovimentacaoResponseApi>>(
    `/produtos/${produtoId}/movimentacoes`,
    {
      params: {
        page: Math.max(0, (params.page || 1) - 1),
        size: params.pageSize || 20,
      },
    },
  );

  return paraPaginado(data, normalizarMovimentacao);
}

export async function obterProduto(id: number): Promise<Produto> {
  const [produtoResp, lotes, movimentacoes] = await Promise.all([
    api.get<ProdutoResponseApi>(`/produtos/${id}`),
    listarLotesProduto(id),
    listarMovimentacoesProduto(id, { page: 1, pageSize: 100 }),
  ]);

  return {
    ...normalizarProduto(produtoResp.data),
    lotes,
    movimentacoes: movimentacoes.items,
  };
}

export async function criarProduto(
  payload: CriarProdutoPayload,
  arquivo?: File | null,
): Promise<Produto> {
  if (!arquivo) {
    const { data } = await api.post<ProdutoResponseApi>("/produtos", payload);
    return normalizarProduto(data);
  }

  // Dados e foto vão na mesma requisição: se a imagem for inválida, nada é cadastrado.
  const formData = new FormData();
  formData.append(
    "produto",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  formData.append("arquivo", arquivo);

  const { data } = await api.post<ProdutoResponseApi>("/produtos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return normalizarProduto(data);
}

export async function criarMovimentacao(
  productId: number,
  payload: CriarMovimentacaoPayload,
): Promise<MovimentacaoResultado> {
  const { data } = await api.post<MovimentacaoResultadoApi>(
    `/produtos/${productId}/movimentacoes`,
    payload,
  );

  return {
    movimentacoes: data.movimentacoes.map(normalizarMovimentacao),
    quantidadeAtual: data.quantidadeAtual,
  };
}

export async function enviarFotoProduto(produtoId: number, arquivo: File) {
  const formData = new FormData();
  formData.append("arquivo", arquivo);

  const { data } = await api.post<{ url: string }>(
    `/produtos/${produtoId}/foto`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return data.url;
}

export async function atualizarProduto(
  id: number,
  payload: AtualizarProdutoPayload,
  arquivo?: File | null,
): Promise<Produto> {
  await api.put(`/produtos/${id}`, payload);

  if (arquivo) {
    await enviarFotoProduto(id, arquivo);
  }

  return obterProduto(id);
}

export async function excluirProduto(id: number): Promise<void> {
  await api.delete(`/produtos/${id}`);
}

export async function listarMovimentacoesLote(
  lotId: number,
  params: ParametrosPaginacao,
): Promise<Paginado<MovimentacaoProduto>> {
  const { data } = await api.get<PaginaApi<MovimentacaoResponseApi>>(
    `/estoques/${lotId}/movimentacoes`,
    {
      params: {
        page: Math.max(0, (params.page || 1) - 1),
        size: params.pageSize || 20,
      },
    },
  );

  return paraPaginado(data, normalizarMovimentacao);
}

export async function listarTiposMovimentacao(): Promise<TipoMovimentacao[]> {
  const { data } = await api.get<TipoMovimentacao[]>("/tipos-movimentacao");
  return data;
}

export async function listarEventosReuniao(): Promise<
  Array<{ id: number; nome: string }>
> {
  const { data } = await api.get<Array<{ id: number; nome: string }>>("/eventos", {
    params: { tipoEvento: "REUNIAO" },
  });
  return data;
}

export function normalizarCategoriaApi(categoria: {
  id: number;
  nome: string;
  descricao?: string | null;
}): Categoria {
  return {
    id: categoria.id,
    nome: categoria.nome,
    descricao: categoria.descricao,
  };
}
