export { default as AssociadosPage } from "./pages/AssociadosPage";
export {
  useAssociadosQuery,
  useTitularesQuery,
} from "./hooks/useAssociados";
export { useConfiguracoesAnuidadeQuery } from "./hooks/useAnuidades";
export { useAssociadosPagina } from "./hooks/useAssociadosPagina";
export type {
  AnuidadeAssociado,
  Associado,
  ConfiguracaoAnuidade,
  ParametrosAssociados,
  RespostaAssociados,
  StatusAnuidade,
  TipoAssociado,
} from "./models";
