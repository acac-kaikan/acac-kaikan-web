import { useMemo, useState } from "react";
import type { OrigemProdutoEvento } from "../models";
import { useEventoCardapioQuery, useEventoQuery } from "./useEventos";

const PAGE_SIZE = 8;

export function useEventoCardapio(id?: number) {
  const { data: event } = useEventoQuery(id);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<OrigemProdutoEvento>("ESTOQUE");
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useEventoCardapioQuery(id, {
    search,
    category: category || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const items = useMemo(() => data?.items || [], [data]);
  const categories = useMemo(() => data?.categories || [], [data]);

  const filtered = useMemo(() => {
    return items.filter((item) => !type || item.origem === type);
  }, [items, type]);

  const totalPages = data?.totalPages ?? 1;
  const safePage = Math.min(data?.page ?? 1, totalPages);
  const visible = filtered;

  function runSearch() {
    setSearch(searchDraft.trim());
    setPage(1);
  }

  function clearFilters() {
    setCategory("");
    setType("");
    setPage(1);
  }

  function clearAll() {
    clearFilters();
    setSearchDraft("");
    setSearch("");
  }

  function changeCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  function changeType(value: string) {
    setType(value);
    setPage(1);
  }

  function openAdd(nextType: OrigemProdutoEvento = "ESTOQUE") {
    setAddType(nextType);
    setAddOpen(true);
  }

  const hasFilters = Boolean(search) || Boolean(category) || Boolean(type);

  return {
    event,
    data,
    isLoading,
    isError,
    refetch,
    items,
    categories,
    filtered,
    visible,
    totalPages,
    safePage,
    searchDraft,
    setSearchDraft,
    filtersOpen,
    setFiltersOpen,
    category,
    type,
    changeCategory,
    changeType,
    setPage,
    addOpen,
    setAddOpen,
    addType,
    categoriesOpen,
    setCategoriesOpen,
    runSearch,
    clearFilters,
    clearAll,
    openAdd,
    hasFilters,
  };
}
