import type {
  Paginado,
  ParametrosPaginacao,
} from "@/shared/models/paginacao";

export type TipoEvento = "EVENTO" | "REUNIAO";

export type StatusEventoCodigo =
  | "NAO_INICIADO"
  | "EM_ANDAMENTO"
  | "ENCERRADO";

export type OrigemProdutoEvento = "ESTOQUE" | "PRODUZIDO";

export interface Status {
  id: number;
  codigo: StatusEventoCodigo;
  descricao: string;
}

/**
 * Métricas legadas consumidas pela página de relatório geral. A API de
 * eventos não devolve este campo; ele permanece opcional para que os
 * consumidores antigos compilem até a integração do relatório.
 */
export interface MetricasEvento {
  revenue: number;
  costs: number;
  profit: number;
  sales: number;
}

export interface ResumoEvento {
  quantidadeProdutos: number;
  quantidadeVendas: number;
  totalVendido: number;
  totalCustosAdicionais: number;
}

export interface Evento {
  id: number;
  nome: string;
  tipoEvento: TipoEvento;
  status: Status;
  dataHoraInicio: string;
  dataHoraEncerramento: string;
  iniciadoEm?: string | null;
  encerradoEm?: string | null;
  observacoes?: string | null;
  metrics?: MetricasEvento;
}

export interface EventoDetalhe extends Evento {
  resumo: ResumoEvento;
}

export interface ItemCardapio {
  id: number;
  origem: OrigemProdutoEvento;
  produtoId?: number | null;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  fotoUrl?: string | null;
  precoVenda: number;
  desconto: number;
  descontoAplicadoEm?: string | null;
  precoComDesconto: number;
  quantidadePrevista?: number | null;
  quantidadeVendida: number;
  restantePrevisto?: number | null;
  custoTotalIngredientes?: number | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CustoEvento {
  id: string;
  nome: string;
  valor: number;
  descricao?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ParametrosEventos extends ParametrosPaginacao {
  statuses?: string;
  types?: string;
  from?: string;
  to?: string;
}

export type RespostaEventos = Paginado<Evento>;

export interface RespostaCardapio extends Paginado<ItemCardapio> {
  categories: string[];
}

export interface CriarEventoPayload {
  nome: string;
  tipoEvento: TipoEvento;
  observacoes?: string;
  dataHoraInicio: string;
  dataHoraEncerramento: string;
}

export type AtualizarEventoPayload = CriarEventoPayload;

export interface CriarCustoEventoPayload {
  nome: string;
  valor: number;
  descricao?: string;
}

export type AtualizarCustoEventoPayload = CriarCustoEventoPayload;

export interface AdicionarProdutoCardapioPayload {
  origem: OrigemProdutoEvento;
  produtoId?: number;
  nome?: string;
  descricao?: string;
  categoria?: string;
  precoVenda: number;
  quantidadePrevista?: number;
  custoTotalIngredientes?: number;
}

export type AtualizarProdutoCardapioPayload = AdicionarProdutoCardapioPayload;

export interface ResumoFinanceiroRelatorio {
  receitaVendas: number;
  descontosVendas: number;
  custoCompras: number;
  custoFichasAgradecimento: number;
  custoIngredientes: number;
  totalCustosAdicionais: number;
  doacoesEmDinheiro: number;
  receitaTotal: number;
  custoTotal: number;
  lucro: number;
  vendas: number;
}

export interface ProdutoRelatorio {
  produtoEventoId: number;
  nome: string;
  origem: OrigemProdutoEvento;
  quantidadePrevista?: number | null;
  quantidadeVendida: number;
  totalDescontos: number;
  custoTotal: number;
  receitaVendas: number;
  lucroBruto: number;
  lucroLiquido: number;
  precoVendido: number;
}

export interface CustoAdicionalRelatorio {
  nome: string;
  descricao?: string | null;
  valor: number;
}

export interface ResumoCaixaRelatorio {
  fichasVendidas: number;
  fichasDevolvidas: number;
  saldoFichas: number;
  porFormaPagamento: Record<string, number>;
  fiadosEmAberto: number;
  quantidadeFiadosEmAberto: number;
  totalRecebido: number;
}

export interface DoacaoItemRelatorio {
  tipo: string;
  produtoId?: number | null;
  nome: string;
  quantidade?: number | null;
  doador: string;
  valorFicha?: number | null;
}

export interface DoacaoDinheiroRelatorio {
  doador: string;
  valor: number;
  formaPagamento: string;
  valorFicha?: number | null;
}

export interface DoacoesRelatorio {
  itens: DoacaoItemRelatorio[];
  emDinheiro: DoacaoDinheiroRelatorio[];
  totalEmDinheiro: number;
}

export interface MovimentacaoRelatorio {
  id: number;
  tipo: string;
  produtoId?: number | null;
  produtoNome: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  observacoes?: string | null;
  criadoEm: string;
}

export interface ProdutoRanking {
  produtoEventoId: number;
  nome: string;
  categoria?: string | null;
  quantidadeVendida: number;
}

export interface RankingProdutos {
  quantidadeVendasTotais: number;
  ranking: ProdutoRanking[];
}

export interface VendaHora {
  hora: number;
  quantidadeVendas: number;
}

export interface VendasPorHoraRelatorio {
  quantidadeVendasTotais: number;
  ranking: VendaHora[];
}

export interface ResumoReuniao {
  custoCompras: number;
  custoConsumoInterno: number;
  totalCustosAdicionais: number;
  custoTotal: number;
}

export interface RelatorioEvento {
  eventoId: number;
  nome: string;
  tipoEvento: "EVENTO";
  status: Status;
  parcial: boolean;
  resumo: ResumoFinanceiroRelatorio;
  produtos: ProdutoRelatorio[];
  custosAdicionais: CustoAdicionalRelatorio[];
  caixa: ResumoCaixaRelatorio;
  doacoes: DoacoesRelatorio;
  movimentacoesEvento: MovimentacaoRelatorio[];
  produtosMaisVendidos: RankingProdutos;
  vendasPorHora: VendasPorHoraRelatorio;
}

export interface RelatorioReuniao {
  eventoId: number;
  nome: string;
  tipoEvento: "REUNIAO";
  status: Status;
  parcial: boolean;
  resumo: ResumoReuniao;
  itens: MovimentacaoRelatorio[];
  custosAdicionais: CustoAdicionalRelatorio[];
}

export type RelatorioEventoResponse = RelatorioEvento | RelatorioReuniao;

export interface DoacaoEvento {
  id: string;
  type: string;
  itemName?: string;
  quantity?: number;
  donor?: string;
  paymentMethod?: string;
  ticketValue?: number;
  createdAt?: string;
}
