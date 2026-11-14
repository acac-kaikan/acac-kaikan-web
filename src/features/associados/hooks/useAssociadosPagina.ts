import { useMemo, useState } from "react";
import { useConfiguracoesAnuidadeQuery } from "./useAnuidades";
import { useAssociadosQuery } from "./useAssociados";
import type {
  ParametrosAssociados,
  StatusAnuidade,
  TipoAssociado,
} from "../models";

function idadeNumerica(valor: string): number | undefined {
  if (!valor.trim()) return undefined;
  const idade = Number(valor);
  return Number.isInteger(idade) && idade >= 0 ? idade : undefined;
}

export function useAssociadosPagina() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [anoEscolhidoState, setAnoEscolhidoState] = useState<number | null>(
    null,
  );
  const [tipoState, setTipoState] = useState<TipoAssociado>();
  const [statusState, setStatusState] = useState<StatusAnuidade>();
  const [idadeMinState, setIdadeMinState] = useState("");
  const [idadeMaxState, setIdadeMaxState] = useState("");

  const configuracoesQuery = useConfiguracoesAnuidadeQuery();
  const ano = anoEscolhidoState ?? configuracoesQuery.data?.[0]?.ano;

  const params = useMemo<ParametrosAssociados>(
    () => ({
      search,
      page,
      pageSize: 10,
      ano,
      tipo: tipoState,
      status: statusState,
      idadeMin: idadeNumerica(idadeMinState),
      idadeMax: idadeNumerica(idadeMaxState),
    }),
    [
      search,
      page,
      ano,
      tipoState,
      statusState,
      idadeMinState,
      idadeMaxState,
    ],
  );

  const associadosQuery = useAssociadosQuery(params, {
    enabled: configuracoesQuery.isSuccess || configuracoesQuery.isError,
  });

  const opcoesAno = (configuracoesQuery.data ?? []).map((configuracao) => ({
    value: String(configuracao.ano),
    label: String(configuracao.ano),
  }));
  const quantidadeFiltrosAtivos = [
    Boolean(search),
    anoEscolhidoState !== null,
    tipoState !== undefined,
    statusState !== undefined,
    idadeNumerica(idadeMinState) !== undefined,
    idadeNumerica(idadeMaxState) !== undefined,
  ].filter(Boolean).length;

  function runSearch() {
    setSearch(searchDraft.trim());
    setPage(1);
  }

  function clearFilters() {
    setAnoEscolhidoState(null);
    setTipoState(undefined);
    setStatusState(undefined);
    setIdadeMinState("");
    setIdadeMaxState("");
    setPage(1);
  }

  function clearAll() {
    clearFilters();
    setSearchDraft("");
    setSearch("");
  }

  function setAnoEscolhido(anoEscolhido: number | null) {
    setAnoEscolhidoState(anoEscolhido);
    setPage(1);
  }

  function setTipo(tipo: TipoAssociado | undefined) {
    setTipoState(tipo);
    setPage(1);
  }

  function setStatus(status: StatusAnuidade | undefined) {
    setStatusState(status);
    setPage(1);
  }

  function setIdadeMin(idade: string) {
    setIdadeMinState(idade);
    setPage(1);
  }

  function setIdadeMax(idade: string) {
    setIdadeMaxState(idade);
    setPage(1);
  }

  return {
    searchDraft,
    setSearchDraft,
    search,
    page,
    setPage,
    filtersOpen,
    setFiltersOpen,
    anoEscolhido: anoEscolhidoState,
    setAnoEscolhido,
    ano,
    tipo: tipoState,
    setTipo,
    status: statusState,
    setStatus,
    idadeMin: idadeMinState,
    setIdadeMin,
    idadeMax: idadeMaxState,
    setIdadeMax,
    associadosQuery,
    configuracoesQuery,
    opcoesAno,
    runSearch,
    clearFilters,
    clearAll,
    hasFilters: quantidadeFiltrosAtivos > 0,
    quantidadeFiltrosAtivos,
  };
}
