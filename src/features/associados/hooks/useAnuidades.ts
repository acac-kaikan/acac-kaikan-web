import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { comporChave, queryKeys } from "@/shared/query/keys";
import type { SalvarConfiguracaoAnuidadePayload } from "../models";
import {
  atualizarConfiguracaoAnuidade,
  criarConfiguracaoAnuidade,
  excluirConfiguracaoAnuidade,
  listarConfiguracoesAnuidade,
} from "../services/anuidades";

export function useConfiguracoesAnuidadeQuery() {
  return useQuery({
    queryKey: comporChave(queryKeys.anuidades, "configuracoes"),
    queryFn: listarConfiguracoesAnuidade,
  });
}

export function useConfiguracaoAnuidadeMutations() {
  const queryClient = useQueryClient();

  function invalidarConsultas() {
    queryClient.invalidateQueries({ queryKey: queryKeys.anuidades });
    queryClient.invalidateQueries({ queryKey: queryKeys.associados });
  }

  const criar = useMutation({
    mutationFn: (payload: SalvarConfiguracaoAnuidadePayload) =>
      criarConfiguracaoAnuidade(payload),
    onSuccess: invalidarConsultas,
  });

  const atualizar = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: SalvarConfiguracaoAnuidadePayload;
    }) => atualizarConfiguracaoAnuidade(id, payload),
    onSuccess: invalidarConsultas,
  });

  const excluir = useMutation({
    mutationFn: (id: number) => excluirConfiguracaoAnuidade(id),
    onSuccess: invalidarConsultas,
  });

  return {
    criarConfiguracao: criar,
    atualizarConfiguracao: atualizar,
    excluirConfiguracao: excluir,
  };
}
