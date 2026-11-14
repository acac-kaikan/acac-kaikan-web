import { useQuery } from "@tanstack/react-query";
import { comporChave, queryKeys } from "@/shared/query/keys";
import { listarConfiguracoesAnuidade } from "../services/anuidades";

export function useConfiguracoesAnuidadeQuery() {
  return useQuery({
    queryKey: comporChave(queryKeys.anuidades, "configuracoes"),
    queryFn: listarConfiguracoesAnuidade,
  });
}
