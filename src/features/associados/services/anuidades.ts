// Contrato provisório: o backend ainda não implementa estes endpoints.
import api from "@/shared/api/cliente";
import type { ConfiguracaoAnuidade } from "../models";

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
