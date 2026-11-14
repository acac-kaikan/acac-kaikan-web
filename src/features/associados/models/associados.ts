import type {
  Paginado,
  ParametrosPaginacao,
} from "@/shared/models/paginacao";

export type TipoAssociado = "TITULAR" | "DEPENDENTE";
export type StatusAnuidade = "PAGO" | "PENDENTE" | "ISENTO";

export interface AnuidadeAssociado {
  id: number;
  valor: number;
  totalPago: number;
  status: StatusAnuidade;
}

export interface Associado {
  id: number;
  nome: string;
  numeroContato: string;
  dataNascimento: string;
  tipo: TipoAssociado;
  titularId: number | null;
  titularNome: string | null;
  anuidade: AnuidadeAssociado | null;
}

export interface ParametrosAssociados extends ParametrosPaginacao {
  ano?: number;
  tipo?: TipoAssociado;
  status?: StatusAnuidade;
  idadeMin?: number;
  idadeMax?: number;
}

export interface SalvarAssociadoPayload {
  nome: string;
  numeroContato: string;
  dataNascimento: string;
  tipo: TipoAssociado;
  titularId?: number | null;
}

export type RespostaAssociados = Paginado<Associado>;

export interface ConfiguracaoAnuidade {
  id: number;
  ano: number;
  valor: number;
}
