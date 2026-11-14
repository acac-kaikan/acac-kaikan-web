import { useQuery } from "@tanstack/react-query";
import { comporChave, queryKeys } from "@/shared/query/keys";
import type { ParametrosAssociados } from "../models";
import { listarAssociados, listarTitulares } from "../services/associados";

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
