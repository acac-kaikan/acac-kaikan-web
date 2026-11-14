import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { lerJSON, salvarJSON } from "@/shared/lib/armazenamentoLocal";
import {
  criarSeedAssociados,
  type AssociadoDemo,
  type DadosAssociadosDemo,
  type StatusAnuidadeDemo,
  type TipoAssociadoDemo,
} from "./dadosAssociados";

const STORAGE_KEY = "kaikan-cachoeira-demo-associados";

export interface ParametrosAssociadosDemo {
  q?: string;
  page?: number;
  size?: number;
  ano?: number;
  tipo?: TipoAssociadoDemo;
  status?: StatusAnuidadeDemo;
  idadeMin?: number;
  idadeMax?: number;
}

interface AnuidadeAssociadoDemo {
  id: number;
  valor: number;
  totalPago: number;
  status: StatusAnuidadeDemo;
}

interface AssociadoComAnuidadeDemo extends AssociadoDemo {
  anuidade: AnuidadeAssociadoDemo | null;
}

interface PaginaAssociadosDemo {
  itens: AssociadoComAnuidadeDemo[];
  page: number;
  size: number;
  totalItens: number;
  totalPaginas: number;
}

let bancoMemoria: DadosAssociadosDemo | null = null;

function obterBanco(): DadosAssociadosDemo {
  if (bancoMemoria) return bancoMemoria;

  const persistido = lerJSON<DadosAssociadosDemo | null>(STORAGE_KEY, null);
  if (persistido) {
    bancoMemoria = persistido;
  } else {
    bancoMemoria = criarSeedAssociados();
    salvarJSON(STORAGE_KEY, bancoMemoria);
  }
  return bancoMemoria;
}

function normalizarBusca(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function calcularIdade(dataNascimento: string): number {
  const [anoNascimento, mesNascimento, diaNascimento] = dataNascimento
    .split("-")
    .map(Number);
  const hoje = new Date();
  const anoAtual = hoje.getUTCFullYear();
  const mesAtual = hoje.getUTCMonth() + 1;
  const diaAtual = hoje.getUTCDate();
  const aniversarioAindaNaoOcorreu =
    mesAtual < mesNascimento ||
    (mesAtual === mesNascimento && diaAtual < diaNascimento);

  return (
    anoAtual -
    anoNascimento -
    (aniversarioAindaNaoOcorreu ? 1 : 0)
  );
}

function paraAssociadoDoAno(
  associado: AssociadoDemo,
  db: DadosAssociadosDemo,
  ano: number | undefined,
): AssociadoComAnuidadeDemo {
  const anuidade = db.anuidades.find(
    (item) => item.associadoId === associado.id && item.ano === ano,
  );

  if (!anuidade) return { ...associado, anuidade: null };

  const totalPago = db.pagamentos
    .filter((pagamento) => pagamento.anuidadeId === anuidade.id)
    .reduce((total, pagamento) => total + pagamento.valor, 0);

  return {
    ...associado,
    anuidade: {
      id: anuidade.id,
      valor: anuidade.valor,
      totalPago,
      status: anuidade.status,
    },
  };
}

export function filtrarAssociados(
  db: DadosAssociadosDemo,
  params: ParametrosAssociadosDemo,
): AssociadoComAnuidadeDemo[] {
  const ano =
    params.ano ??
    (db.configuracoes.length
      ? Math.max(...db.configuracoes.map((configuracao) => configuracao.ano))
      : undefined);
  const busca = params.q ? normalizarBusca(params.q.trim()) : "";

  return db.associados
    .map((associado) => paraAssociadoDoAno(associado, db, ano))
    .filter(
      (associado) =>
        !busca ||
        normalizarBusca(associado.nome).includes(busca) ||
        normalizarBusca(associado.titularNome || "").includes(busca),
    )
    .filter((associado) => !params.tipo || associado.tipo === params.tipo)
    .filter(
      (associado) =>
        !params.status || associado.anuidade?.status === params.status,
    )
    .filter((associado) => {
      if (params.idadeMin === undefined && params.idadeMax === undefined) {
        return true;
      }
      const idade = calcularIdade(associado.dataNascimento);
      return (
        (params.idadeMin === undefined || idade >= params.idadeMin) &&
        (params.idadeMax === undefined || idade <= params.idadeMax)
      );
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function montarPaginaAssociados(
  db: DadosAssociadosDemo,
  params: ParametrosAssociadosDemo,
): PaginaAssociadosDemo {
  const associados = filtrarAssociados(db, params);
  const sizeInformado = params.size ?? 10;
  const size =
    Number.isFinite(sizeInformado) && sizeInformado > 0
      ? Math.trunc(sizeInformado)
      : 10;
  const totalItens = associados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / size));
  const pageSolicitada = Math.max(0, Math.trunc(params.page ?? 0));
  const page = Math.min(pageSolicitada, totalPaginas - 1);
  const inicio = page * size;

  return {
    itens: associados.slice(inicio, inicio + size),
    page,
    size,
    totalItens,
    totalPaginas,
  };
}

function respostaOk(
  config: InternalAxiosRequestConfig,
  data: unknown,
): Promise<AxiosResponse> {
  return Promise.resolve({
    data: JSON.parse(JSON.stringify(data)),
    status: 200,
    statusText: "OK",
    headers: {},
    config,
    request: {},
  });
}

function respostaErro(
  config: InternalAxiosRequestConfig,
  erro: unknown,
): Promise<never> {
  const message =
    erro instanceof Error ? erro.message : "Erro ao carregar associados.";
  const response: AxiosResponse = {
    status: 500,
    statusText: "Erro",
    headers: {},
    config,
    data: { message },
  };
  return Promise.reject(
    new AxiosError(message, "ERR_DEMO_REQUEST", config, null, response),
  );
}

function numeroParametro(
  params: URLSearchParams,
  chave: string,
): number | undefined {
  const valor = params.get(chave);
  if (valor === null || valor.trim() === "") return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}

function tipoParametro(params: URLSearchParams): TipoAssociadoDemo | undefined {
  const tipo = params.get("tipo");
  return tipo === "TITULAR" || tipo === "DEPENDENTE" ? tipo : undefined;
}

function statusParametro(
  params: URLSearchParams,
): StatusAnuidadeDemo | undefined {
  const status = params.get("status");
  return status === "PAGO" || status === "PENDENTE" || status === "ISENTO"
    ? status
    : undefined;
}

export function rotearAssociadosDemo({
  config,
  path,
  params,
  method,
}: {
  config: InternalAxiosRequestConfig;
  path: string;
  params: URLSearchParams;
  method: string;
}): Promise<AxiosResponse> | null {
  const rotaAssociados = method === "get" && path === "/associados";
  const rotaConfiguracoes =
    method === "get" && path === "/anuidades/configuracoes";

  if (!rotaAssociados && !rotaConfiguracoes) return null;

  return Promise.resolve()
    .then(() => {
      const db = obterBanco();
      if (rotaConfiguracoes) {
        return [...db.configuracoes]
          .sort((a, b) => b.ano - a.ano)
          .map((configuracao) => ({ ...configuracao }));
      }

      return montarPaginaAssociados(db, {
        q: params.get("q") || undefined,
        page: numeroParametro(params, "page"),
        size: numeroParametro(params, "size"),
        ano: numeroParametro(params, "ano"),
        tipo: tipoParametro(params),
        status: statusParametro(params),
        idadeMin: numeroParametro(params, "idadeMin"),
        idadeMax: numeroParametro(params, "idadeMax"),
      });
    })
    .then((data) => respostaOk(config, data))
    .catch((erro: unknown) => respostaErro(config, erro));
}
