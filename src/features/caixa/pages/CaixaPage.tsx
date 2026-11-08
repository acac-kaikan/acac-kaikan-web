import { Link } from "react-router-dom";
import BotaoVoltar from "@/shared/components/BotaoVoltar/BotaoVoltar";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import Abas from "@/shared/components/Abas/Abas";
import Selecao from "@/shared/components/Formulario/Selecao";
import Botao from "@/shared/components/Botao/Botao";
import Paginacao from "@/shared/components/Paginacao/Paginacao";
import ConfirmacaoDialog from "@/shared/components/ConfirmacaoDialog/ConfirmacaoDialog";
import { EstatisticaCard } from "@/shared/components/Card/Card";
import {
  EstadoVazio,
  EstadoErro,
  EstadoCarregando,
} from "@/shared/components/Estado/Estado";
import { useCaixa } from "../hooks/useCaixa";
import { formatarMoeda, formatarHoraHoje } from "@/shared/lib/formatacao";
import type {
  FormaPagamentoCaixa,
  LancamentoCaixa,
  TipoLancamentoCaixa,
} from "../models";
import PainelLancamentoCaixa from "../components/PainelLancamentoCaixa";
import styles from "./Caixa.module.css";

const TYPE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "VENDA_FICHA", label: "Venda de fichas" },
  { value: "DEVOLUCAO_FICHA", label: "Devolução" },
  { value: "QUITACAO_FIADO", label: "Quitação de fiado" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "PIX", label: "PIX" },
  { value: "DEBITO", label: "Débito" },
  { value: "CREDITO", label: "Crédito" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "FIADO", label: "Fiado" },
];

function tipoLabel(tipo: LancamentoCaixa["tipo"]) {
  if (tipo === "VENDA_FICHA") return "Venda";
  if (tipo === "DEVOLUCAO_FICHA") return "Devolução";
  return "Quitação";
}

function pagamentoLabel(formaPagamento: LancamentoCaixa["formaPagamento"]) {
  if (formaPagamento === "DEBITO") return "Débito";
  if (formaPagamento === "CREDITO") return "Crédito";
  if (formaPagamento === "DINHEIRO") return "Dinheiro";
  if (formaPagamento === "FIADO") return "Fiado";
  return "PIX";
}

function cancelLabel(entry: LancamentoCaixa) {
  if (entry.formaPagamento === "FIADO") return "Cancelar fiado";
  if (entry.tipo === "VENDA_FICHA") return "Cancelar venda";
  if (entry.tipo === "DEVOLUCAO_FICHA") return "Cancelar devolução";
  return "Cancelar quitação";
}

export default function CaixaPage() {
  const {
    event,
    eventLoading,
    type,
    setType,
    payment,
    setPayment,
    setPage,
    cancelTarget,
    setCancelTarget,
    caixaQuery,
    summary,
    entries,
    tabs,
    cancelarLancamento,
    clearFilters,
    confirmCancel,
  } = useCaixa();
  const { data, isLoading, isError, refetch } = caixaQuery;

  if (eventLoading) {
    return <EstadoCarregando message="Carregando caixa..." />;
  }

  if (!event) {
    return (
      <div className={styles.page}>
        <BotaoVoltar fallback="/inicio" />
        <PageHeader
          subtitle="Controle de fichas, pagamentos e fiados"
        />
        <EstadoVazio
          title="Nenhum evento em andamento."
          description="Inicie um evento para registrar e consultar o caixa."
          icon="cash"
          action={
            <Botao as={Link} to="/eventos">
              Ir para eventos
            </Botao>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <BotaoVoltar fallback="/inicio" />
      <PageHeader
        subtitle="Controle de fichas, pagamentos e fiados"
      />

      <section className={styles.statsGrid} aria-label="Resumo do caixa">
        <EstatisticaCard
          label="Fichas vendidas"
          value={formatarMoeda(summary.fichasVendidas)}
        />
        <EstatisticaCard
          label="Fichas devolvidas"
          value={formatarMoeda(summary.fichasDevolvidas)}
        />
        <EstatisticaCard
          label="Fiados em aberto"
          value={formatarMoeda(summary.fiadosEmAberto)}
        />
      </section>

      <div className={styles.layout}>
        <div className={styles.left}>
          <Abas items={tabs} label="Seções do caixa" />

          <div className={styles.filters}>
            <Selecao
              id="caixa-filtro-tipo"
              label="Tipo de registro"
              options={TYPE_OPTIONS}
              value={type}
                onChange={(changeEvent) => {
                  setType(changeEvent.target.value as TipoLancamentoCaixa | "");
                  setPage(1);
                }}
              />
            <Selecao
              id="caixa-filtro-pagamento"
              label="Forma de pagamento"
              options={PAYMENT_OPTIONS}
              value={payment}
                onChange={(changeEvent) => {
                  setPayment(changeEvent.target.value as FormaPagamentoCaixa | "");
                  setPage(1);
                }}
              />
            <Botao
              variant="secondary"
              className={styles.clearButton}
              onClick={clearFilters}
            >
              Limpar filtros
            </Botao>
          </div>

          <section className={styles.listCard} aria-labelledby="historico-caixa">
            <header className={styles.listHeader}>
              <h2 id="historico-caixa">Histórico de lançamentos</h2>
            </header>

            {isLoading ? (
              <EstadoCarregando message="Carregando lançamentos..." />
            ) : isError ? (
              <EstadoErro
                message="Não foi possível carregar o caixa."
                onRetry={refetch}
              />
            ) : entries.length ? (
              <ul className={styles.list}>
                {entries.map((entry) => (
                  <li className={styles.row} key={entry.id}>
                    <strong>
                      {formatarMoeda(entry.valor)}
                    </strong>
                    <span className={styles.rowPayment}>
                      {tipoLabel(entry.tipo)} - {pagamentoLabel(entry.formaPagamento)}
                    </span>
                    <span className={styles.rowDate}>
                      {formatarHoraHoje(entry.criadoEm)}
                    </span>
                    <div className={styles.rowAction}>
                      <Botao
                        variant="secondary"
                        size="compact"
                        onClick={() => setCancelTarget(entry)}
                      >
                        {cancelLabel(entry)}
                      </Botao>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoVazio
                title="Nenhum lançamento encontrado."
                description={
                  type || payment
                    ? "Ajuste os filtros para ver outros lançamentos."
                    : "Os lançamentos do caixa aparecerão aqui."
                }
                icon="cash"
                action={
                  type || payment ? (
                    <Botao variant="secondary" onClick={clearFilters}>
                      Limpar filtros
                    </Botao>
                  ) : null
                }
              />
            )}
          </section>

          {entries.length && data && data.totalPages > 1 ? (
            <Paginacao
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </div>

        <PainelLancamentoCaixa eventId={event.id} />
      </div>

      {cancelTarget ? (
        <ConfirmacaoDialog
          title={cancelLabel(cancelTarget)}
          message={`Deseja cancelar este lançamento de ${formatarMoeda(
            cancelTarget.valor,
          )}? ${
            cancelTarget.formaPagamento === "FIADO"
              ? "O fiado correspondente também será removido."
              : "O valor deixará de ser considerado no resumo do caixa."
          }`}
          confirmLabel={cancelLabel(cancelTarget)}
          cancelLabel="Voltar"
          destructive
          loading={cancelarLancamento.isPending}
          onCancel={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
        />
      ) : null}
    </div>
  );
}
