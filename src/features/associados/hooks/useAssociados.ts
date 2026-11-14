import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { comporChave, queryKeys } from "@/shared/query/keys";
import type {
  ParametrosAssociados,
  SalvarAssociadoPayload,
} from "../models";
import {
  atualizarAssociado,
  criarAssociado,
  listarAssociados,
  listarTitulares,
} from "../services/associados";

export function useAssociadosQuery(
  params: ParametrosAssociados,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: comporChave(queryKeys.associados, params),
    queryFn: () => listarAssociados(params),
    enabled: options?.enabled,
  });
}

export function useTitularesQuery() {
  return useQuery({
    queryKey: comporChave(queryKeys.associados, "titulares"),
    queryFn: listarTitulares,
  });
}

export function useAssociadoMutations() {
  const queryClient = useQueryClient();

  const criar = useMutation({
    mutationFn: (payload: SalvarAssociadoPayload) => criarAssociado(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.associados });
    },
  });

  const atualizar = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: SalvarAssociadoPayload;
    }) => atualizarAssociado(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.associados });
    },
  });

  return {
    criarAssociado: criar,
    atualizarAssociado: atualizar,
  };
}
