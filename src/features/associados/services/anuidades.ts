// Contrato provisório: o backend ainda não implementa estes endpoints.
import api from "@/shared/api/cliente";
import type {
  ConfiguracaoAnuidade,
  SalvarConfiguracaoAnuidadePayload,
} from "../models";

interface ConfiguracaoAnuidadeApi {
  id: number;
  ano: number;
  valor: number;
}

function paraConfiguracaoAnuidade(
  configuracao: ConfiguracaoAnuidadeApi,
): ConfiguracaoAnuidade {
  return {
    id: configuracao.id,
    ano: configuracao.ano,
    valor: configuracao.valor,
  };
}

export async function listarConfiguracoesAnuidade(): Promise<
  ConfiguracaoAnuidade[]
> {
  const { data } = await api.get<ConfiguracaoAnuidadeApi[]>(
    "/anuidades/configuracoes",
  );
  return data
    .map(paraConfiguracaoAnuidade)
    .sort((a, b) => b.ano - a.ano);
}

export async function criarConfiguracaoAnuidade(
  payload: SalvarConfiguracaoAnuidadePayload,
): Promise<ConfiguracaoAnuidade> {
  const { data } = await api.post<ConfiguracaoAnuidadeApi>(
    "/anuidades/configuracoes",
    payload,
  );
  return paraConfiguracaoAnuidade(data);
}

export async function atualizarConfiguracaoAnuidade(
  id: number,
  payload: SalvarConfiguracaoAnuidadePayload,
): Promise<ConfiguracaoAnuidade> {
  const { data } = await api.put<ConfiguracaoAnuidadeApi>(
    `/anuidades/configuracoes/${id}`,
    payload,
  );
  return paraConfiguracaoAnuidade(data);
}

export async function excluirConfiguracaoAnuidade(id: number): Promise<void> {
  await api.delete(`/anuidades/configuracoes/${id}`);
}
