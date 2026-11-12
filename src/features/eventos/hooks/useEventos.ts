import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useToast } from "@/shared/components/Toast/ToastProvider";
import { mensagemErro } from "@/shared/api/erros";
import { comporChave, queryKeys } from "@/shared/query/keys";
import type {
  AdicionarProdutoCardapioPayload,
  AtualizarCustoEventoPayload,
  AtualizarEventoPayload,
  AtualizarProdutoCardapioPayload,
  CriarCustoEventoPayload,
  CriarEventoPayload,
  Evento,
  ParametrosEventos,
  StatusEventoCodigo,
} from "../models";
import {
  adicionarProdutoCardapio,
  alterarStatusEvento,
  atualizarEvento,
  atualizarCustoEvento,
  atualizarProdutoCardapio,
  criarCustoEvento,
  criarEvento,
  enviarFotoProdutoCardapio,
  excluirCustoEvento,
  excluirProdutoCardapio,
  excluirEvento,
  listarEventos,
  listarProdutosEvento,
  obterCardapioEvento,
  obterEvento,
  obterEventoAtual,
  obterRelatorioEvento,
} from "../services/eventos";
import { idDoStatus } from "../utils/statusEvento";

function idValido(id: number | null | undefined): id is number {
  return typeof id === "number" && Number.isFinite(id);
}

export function useEventosQuery(params: ParametrosEventos) {
  const consultaRemota = useMemo(
    () => ({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      statuses: params.statuses,
      types: params.types,
      from: params.from,
      to: params.to,
    }),
    [
      params.page,
      params.pageSize,
      params.search,
      params.statuses,
      params.types,
      params.from,
      params.to,
    ],
  );

  return useQuery({
    queryKey: comporChave(queryKeys.eventos, "lista", consultaRemota),
    queryFn: () => listarEventos(consultaRemota),
  });
}

export function useEventoAtualQuery() {
  return useQuery({
    queryKey: comporChave(queryKeys.eventos, "atual"),
    queryFn: obterEventoAtual,
  });
}

export function useEventoQuery(id?: number | null) {
  return useQuery({
    queryKey: comporChave(queryKeys.eventos, "detalhe", id),
    queryFn: () => obterEvento(id as number),
    enabled: idValido(id),
  });
}

export function useRelatorioEventoQuery(
  id?: number | null,
  statusCodigo?: StatusEventoCodigo,
) {
  return useQuery({
    queryKey: comporChave(queryKeys.eventos, "relatorio", id),
    queryFn: () => obterRelatorioEvento(id as number),
    enabled:
      idValido(id) &&
      statusCodigo !== undefined &&
      statusCodigo !== "NAO_INICIADO",
    retry: false,
  });
}

export function useEventoProdutosQuery(
  id?: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: comporChave(queryKeys.eventos, "produtos", id),
    queryFn: () => listarProdutosEvento(id as number),
    enabled: idValido(id) && enabled,
  });
}

export function useEventoCardapioQuery(
  id?: number | null,
  params?: {
    search?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  },
) {
  return useQuery({
    queryKey: comporChave(queryKeys.eventos, "cardapio", id, params),
    queryFn: () => obterCardapioEvento(id as number, params),
    enabled: idValido(id),
  });
}

export function useEventoMutations() {
  const queryClient = useQueryClient();

  function invalidarEventos() {
    queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
    queryClient.invalidateQueries({ queryKey: queryKeys.vendas });
    queryClient.invalidateQueries({ queryKey: queryKeys.caixa });
    queryClient.invalidateQueries({ queryKey: queryKeys.fiados });
    queryClient.invalidateQueries({ queryKey: queryKeys.doacoes });
  }

  function invalidarDetalhe(id: number) {
    queryClient.invalidateQueries({
      queryKey: comporChave(queryKeys.eventos, "detalhe", id),
    });
    queryClient.invalidateQueries({
      queryKey: comporChave(queryKeys.eventos, "relatorio", id),
    });
    queryClient.invalidateQueries({
      queryKey: comporChave(queryKeys.eventos, "produtos", id),
    });
  }

  const criar = useMutation({
    mutationFn: (payload: CriarEventoPayload) => criarEvento(payload),
    onSuccess: invalidarEventos,
  });

  const atualizar = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: AtualizarEventoPayload;
    }) => atualizarEvento(id, payload),
    onSuccess: (_data, variables) => {
      invalidarEventos();
      invalidarDetalhe(variables.id);
    },
  });

  const alterarStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusEventoCodigo }) =>
      alterarStatusEvento(id, idDoStatus(status)),
    onSuccess: (_data, variables) => {
      invalidarEventos();
      invalidarDetalhe(variables.id);
    },
  });

  const excluir = useMutation({
    mutationFn: (id: number) => excluirEvento(id),
    onSuccess: invalidarEventos,
  });

  const criarCusto = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: CriarCustoEventoPayload;
    }) => criarCustoEvento(id, payload),
    onSuccess: (_data, variables) => {
      invalidarEventos();
      invalidarDetalhe(variables.id);
    },
  });

  const atualizarCusto = useMutation({
    mutationFn: ({
      id,
      custoId,
      payload,
    }: {
      id: number;
      custoId: string;
      payload: AtualizarCustoEventoPayload;
    }) => atualizarCustoEvento(id, custoId, payload),
    onSuccess: (_data, variables) => {
      invalidarEventos();
      invalidarDetalhe(variables.id);
    },
  });

  const excluirCusto = useMutation({
    mutationFn: ({ id, custoId }: { id: number; custoId: string }) =>
      excluirCustoEvento(id, custoId),
    onSuccess: (_data, variables) => {
      invalidarEventos();
      invalidarDetalhe(variables.id);
    },
  });

  function invalidarCardapio(id: number) {
    invalidarEventos();
    invalidarDetalhe(id);
    queryClient.invalidateQueries({
      queryKey: comporChave(queryKeys.eventos, "cardapio", id),
    });
  }

  const adicionarProduto = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: AdicionarProdutoCardapioPayload;
    }) => adicionarProdutoCardapio(id, payload),
    onSuccess: (_data, variables) => {
      invalidarCardapio(variables.id);
    },
  });

  const atualizarProduto = useMutation({
    mutationFn: ({
      eventId,
      itemId,
      payload,
    }: {
      eventId: number;
      itemId: number;
      payload: AtualizarProdutoCardapioPayload;
    }) => atualizarProdutoCardapio(eventId, itemId, payload),
    onSuccess: (_data, variables) => {
      invalidarCardapio(variables.eventId);
    },
  });

  const excluirProduto = useMutation({
    mutationFn: ({
      eventId,
      itemId,
    }: {
      eventId: number;
      itemId: number;
    }) => excluirProdutoCardapio(eventId, itemId),
    onSuccess: (_data, variables) => {
      invalidarCardapio(variables.eventId);
    },
  });

  const enviarFoto = useMutation({
    mutationFn: ({
      eventId,
      itemId,
      arquivo,
    }: {
      eventId: number;
      itemId: number;
      arquivo: File;
    }) => enviarFotoProdutoCardapio(eventId, itemId, arquivo),
    onSuccess: (_data, variables) => {
      invalidarCardapio(variables.eventId);
    },
  });

  return {
    criarEvento: criar,
    atualizarEvento: atualizar,
    alterarStatus,
    excluirEvento: excluir,
    criarCusto,
    atualizarCusto,
    excluirCusto,
    adicionarProduto,
    atualizarProduto,
    excluirProduto,
    enviarFoto,
  };
}

export function useEventos() {
  const { addToast } = useToast();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Evento | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    event: Evento;
    status: StatusEventoCodigo;
  } | null>(null);

  const { alterarStatus, excluirEvento } = useEventoMutations();

  const params = useMemo<ParametrosEventos>(
    () => ({
      search,
      page,
      pageSize: 8,
      statuses: statuses.length ? statuses.join(",") : undefined,
      types: types.length ? types.join(",") : undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [search, page, statuses, types, from, to],
  );

  const eventosQuery = useEventosQuery(params);

  async function handleStatus(event: Evento, nextStatus: StatusEventoCodigo) {
    try {
      await alterarStatus.mutateAsync({ id: event.id, status: nextStatus });
      addToast(
        nextStatus === "EM_ANDAMENTO"
          ? `Evento "${event.nome}" iniciado.`
          : nextStatus === "ENCERRADO"
            ? `Evento "${event.nome}" encerrado.`
            : `Início do evento "${event.nome}" desfeito.`,
      );
    } catch (error) {
      addToast(
        mensagemErro(error, "Não foi possível alterar a situação do evento."),
        "error",
      );
    }
  }

  function requestStatus(event: Evento, status: StatusEventoCodigo) {
    setStatusTarget({ event, status });
  }

  async function confirmStatus() {
    if (!statusTarget) return;
    try {
      await handleStatus(statusTarget.event, statusTarget.status);
    } finally {
      setStatusTarget(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await excluirEvento.mutateAsync(deleteTarget.id);
      addToast(`Evento "${deleteTarget.nome}" excluído.`);
      setDeleteTarget(null);
    } catch (error) {
      addToast(
        mensagemErro(error, "Não foi possível excluir o evento."),
        "error",
      );
    }
  }

  function runSearch() {
    setSearch(searchDraft.trim());
    setPage(1);
  }

  function clearFilters() {
    setStatuses([]);
    setTypes([]);
    setFrom("");
    setTo("");
    setPage(1);
  }

  function clearAll() {
    clearFilters();
    setSearchDraft("");
    setSearch("");
  }

  return {
    searchDraft,
    setSearchDraft,
    search,
    page,
    setPage,
    filtersOpen,
    setFiltersOpen,
    statuses,
    setStatuses,
    types,
    setTypes,
    from,
    setFrom,
    to,
    setTo,
    createOpen,
    setCreateOpen,
    deleteTarget,
    setDeleteTarget,
    statusTarget,
    setStatusTarget,
    eventosQuery,
    alterarStatus,
    excluirEvento,
    handleStatus,
    requestStatus,
    confirmStatus,
    confirmDelete,
    runSearch,
    clearFilters,
    clearAll,
  };
}
