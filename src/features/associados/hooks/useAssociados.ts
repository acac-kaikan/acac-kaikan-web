import { useQuery } from "@tanstack/react-query";
import { comporChave, queryKeys } from "@/shared/query/keys";
import type { ParametrosAssociados } from "../models";
import { listarAssociados, listarTitulares } from "../services/associados";

export function useAssociadosQuery(params: ParametrosAssociados) {
  return useQuery({
    queryKey: comporChave(queryKeys.associados, params),
    queryFn: () => listarAssociados(params),
  });
}

export function useTitularesQuery() {
  return useQuery({
    queryKey: comporChave(queryKeys.associados, "titulares"),
    queryFn: listarTitulares,
  });
}
