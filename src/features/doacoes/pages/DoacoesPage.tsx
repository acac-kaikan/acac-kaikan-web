import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import BarraPesquisa from "@/shared/components/BarraPesquisa/BarraPesquisa";
import PainelFiltros from "@/shared/components/Filtros/PainelFiltros";
import SelecaoMultipla from "@/shared/components/Formulario/SelecaoMultipla";
import Botao from "@/shared/components/Botao/Botao";
import Etiqueta from "@/shared/components/Etiqueta/Etiqueta";
import Icone from "@/shared/components/Icone/Icone";
import Paginacao from "@/shared/components/Paginacao/Paginacao";
import {
  Tabela,
  Cabecalho,
  Corpo,
  Linha,
  CelulaCabecalho,
  Celula,
} from "@/shared/components/Tabela/Tabela";
import {
  EstadoVazio,
  EstadoErro,
  EstadoCarregando,
} from "@/shared/components/Estado/Estado";
import ConfirmacaoDialog from "@/shared/components/ConfirmacaoDialog/ConfirmacaoDialog";
import { useEventoQuery } from "@/features/eventos";
import type { Doacao } from "../models";
import { useDoacoes } from "../hooks/useDoacoes";
import { useToast } from "@/shared/components/Toast/ToastProvider";
import {
  formatarMoeda,
  formatarDataHora,
  formatarNumero,
} from "@/shared/lib/formatacao";
import {
  OPCOES_TIPO_DOACAO,
  rotuloTipoDoacao,
} from "@/shared/lib/tiposDoacao";
import DoacaoModal from "../components/DoacaoModal";
import styles from "./DoacoesPage.module.css";

function donationLabel(donation: Doacao) {
  if (donation.tipo === "DINHEIRO") {
    return `${formatarMoeda(donation.valor)} · ${donation.formaPagamento || "PIX"}`;
  }
  return `${donation.nome || "Doação"}${
    donation.quantidade
      ? ` · ${formatarNumero(donation.quantidade)} unidades`
      : ""
  }`;
}

export default function DoacoesPage() {
  const location = useLocation();
  const navigationState = location.state as { fromEventId?: unknown } | null;
  const eventIdCandidate = Number(navigationState?.fromEventId);
  const eventId =
    Number.isInteger(eventIdCandidate) && eventIdCandidate > 0
      ? eventIdCandidate
      : null;
  const sourceEventQuery = useEventoQuery(eventId);
  const hasValidSourceEvent = sourceEventQuery.data?.id === eventId;
  const { addToast } = useToast();
  const [actionsMenu, setActionsMenu] = useState<{
    donation: Doacao;
    top: number;
    left: number;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<Doacao | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Doacao | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuDonationRef = useRef<Doacao | null>(null);
  const {
    searchDraft,
    setSearchDraft,
    search,
    setPage,
    filtersOpen,
    setFiltersOpen,
    selectedEvents,
    setSelectedEvents,
    selectedTypes,
    setSelectedTypes,
    modalOpen,
    setModalOpen,
    doacoesQuery,
    eventOptions,
    runSearch,
    clearFilters,
    clearAll,
  } = useDoacoes();
  const { data, isLoading, isError, refetch } = doacoesQuery;

  const hasFilters =
    Boolean(search) || selectedEvents.length > 0 || selectedTypes.length > 0;

  function closeActionsMenu(returnFocus = false) {
    setActionsMenu(null);
    menuDonationRef.current = null;
    if (returnFocus) triggerRef.current?.focus();
  }

  function toggleActionsMenu(
    donation: Doacao,
    trigger: HTMLButtonElement,
  ) {
    if (actionsMenu?.donation.id === donation.id) {
      closeActionsMenu();
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const width = 240;
    const height = 96;
    const left = Math.max(
      8,
      Math.min(rect.right - width, window.innerWidth - width - 8),
    );
    let top = rect.bottom + 4;
    if (top + height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - height - 4);
    }
    triggerRef.current = trigger;
    menuDonationRef.current = donation;
    setActionsMenu({ donation, top, left });
  }

  const activeMenuDonationId = actionsMenu?.donation.id;

  useEffect(() => {
    if (!activeMenuDonationId) return undefined;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        closeActionsMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeActionsMenu(true);
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const options = menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      );
      if (!options?.length) return;
      event.preventDefault();
      const currentIndex = Array.from(options).indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : event.key === "ArrowDown"
              ? (currentIndex + 1) % options.length
              : (currentIndex - 1 + options.length) % options.length;
      options[nextIndex]?.focus();
    }

    function updatePosition() {
      const donation = menuDonationRef.current;
      const trigger = triggerRef.current;
      if (!donation || !trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = 184;
      const height = 96;
      const left = Math.max(
        8,
        Math.min(rect.right - width, window.innerWidth - width - 8),
      );
      let top = rect.bottom + 4;
      if (top + height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - height - 4);
      }
      setActionsMenu({ donation, top, left });
    }

    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
    });
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [activeMenuDonationId]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    addToast("Exclusão de doação ainda não disponível.", "info");
    setDeleteTarget(null);
  }

  return (
    <div className={styles.stack}>
      <Link
        to={
          hasValidSourceEvent && eventId
            ? `/eventos/${eventId}`
            : "/eventos"
        }
        className={styles.backLink}
      >
        <Icone name="arrow-left" size={18} />
        {hasValidSourceEvent
          ? "Voltar para o evento"
          : "Voltar para eventos"}
      </Link>
      <PageHeader
        subtitle="Doações destinadas e consumidas em cada evento"
        actions={
          <Botao iconLeft="plus" onClick={() => setModalOpen(true)}>
            Registrar doação
          </Botao>
        }
      />

      <BarraPesquisa
        value={searchDraft}
        onChange={setSearchDraft}
        onSubmit={runSearch}
        placeholder="Pesquisar doador ou item..."
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
      />

      {filtersOpen ? (
        <PainelFiltros onClear={clearFilters}>
          <SelecaoMultipla
            label="Eventos"
            options={eventOptions}
            value={selectedEvents.map(String)}
            onChange={(value) => {
              setSelectedEvents(value.map(Number));
              setPage(1);
            }}
            placeholder="Todos"
          />
          <SelecaoMultipla
            label="Tipo de doação"
            options={OPCOES_TIPO_DOACAO}
            value={selectedTypes}
            onChange={(value) => {
              setSelectedTypes(value);
              setPage(1);
            }}
            placeholder="Todos"
          />
        </PainelFiltros>
      ) : null}

      {isLoading ? (
        <EstadoCarregando message="Carregando doações..." />
      ) : isError ? (
        <EstadoErro
          message="Não foi possível carregar as doações."
          onRetry={refetch}
        />
      ) : data?.items?.length ? (
        <>
          <Tabela caption="Doações registradas">
            <Cabecalho>
              <Linha>
                <CelulaCabecalho>Doação</CelulaCabecalho>
                <CelulaCabecalho>Doador</CelulaCabecalho>
                <CelulaCabecalho>Evento destinado</CelulaCabecalho>
                <CelulaCabecalho>Tipo</CelulaCabecalho>
                <CelulaCabecalho numeric>Custo da ficha</CelulaCabecalho>
                <CelulaCabecalho>Data</CelulaCabecalho>
                <CelulaCabecalho>Ações</CelulaCabecalho>
              </Linha>
            </Cabecalho>
            <Corpo>
              {data.items.map((donation) => (
                <Linha key={donation.id}>
                  <Celula>{donationLabel(donation)}</Celula>
                  <Celula>{donation.doador || "Não informado"}</Celula>
                  <Celula>{donation.eventoNome}</Celula>
                  <Celula>
                    <Etiqueta
                      variant={donation.tipo === "DINHEIRO" ? "success" : "neutral"}
                    >
                      {rotuloTipoDoacao(donation.tipo)}
                    </Etiqueta>
                  </Celula>
                  <Celula numeric>{formatarMoeda(donation.valorFicha)}</Celula>
                  <Celula>{formatarDataHora(donation.criadoEm)}</Celula>
                  <Celula>
                    <button
                      type="button"
                      className={styles.moreButton}
                      id={`menu-trigger-doacao-${donation.id}`}
                      aria-label={`Mais opções da doação de ${donation.doador || donation.nome}`}
                      aria-haspopup="menu"
                      aria-expanded={actionsMenu?.donation.id === donation.id}
                      aria-controls={
                        actionsMenu?.donation.id === donation.id
                          ? `menu-doacao-${donation.id}`
                          : undefined
                      }
                      onClick={(event) =>
                        toggleActionsMenu(donation, event.currentTarget)
                      }
                    >
                      <Icone name="more-vertical" size={20} />
                    </button>
                  </Celula>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
          <Paginacao
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EstadoVazio
          title={
            hasFilters
              ? "Nenhuma doação encontrada."
              : "Nenhuma doação registrada."
          }
          description={
            hasFilters
              ? "Ajuste a pesquisa ou limpe os filtros."
              : "Registre a primeira doação destinada a um evento."
          }
          icon="gift"
          action={
            hasFilters ? (
              <Botao variant="secondary" onClick={clearAll}>
                Limpar filtros
              </Botao>
            ) : (
              <Botao onClick={() => setModalOpen(true)}>
                Registrar doação
              </Botao>
            )
          }
        />
      )}

      {modalOpen ? (
        <DoacaoModal onClose={() => setModalOpen(false)} />
      ) : null}

      {editTarget ? (
        <DoacaoModal
          doacao={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmacaoDialog
          title="Excluir doação"
          message={`Deseja excluir "${donationLabel(deleteTarget)}", doada por "${deleteTarget.doador || "Não informado"}"?`}
          confirmLabel="Excluir doação"
          destructive
          loading={false}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      {actionsMenu
        ? createPortal(
            <div
              ref={menuRef}
              id={`menu-doacao-${actionsMenu.donation.id}`}
              className={styles.actionsMenu}
              role="menu"
              aria-labelledby={`menu-trigger-doacao-${actionsMenu.donation.id}`}
              style={{ top: actionsMenu.top, left: actionsMenu.left }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setEditTarget(actionsMenu.donation);
                  closeActionsMenu();
                }}
              >
                <Icone name="edit" size={32} />
                Editar doação
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.dangerMenuItem}
                onClick={() => {
                  setDeleteTarget(actionsMenu.donation);
                  closeActionsMenu();
                }}
              >
                <Icone name="trash" size={32} />
                Excluir doação
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
