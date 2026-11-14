import PageHeader from "@/shared/components/PageHeader/PageHeader";
import BarraPesquisa from "@/shared/components/BarraPesquisa/BarraPesquisa";
import PainelFiltros from "@/shared/components/Filtros/PainelFiltros";
import Selecao from "@/shared/components/Formulario/Selecao";
import Entrada from "@/shared/components/Formulario/Entrada";
import Botao from "@/shared/components/Botao/Botao";
import Etiqueta from "@/shared/components/Etiqueta/Etiqueta";
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
import { formatarMoeda, iniciais, pluralizar } from "@/shared/lib/formatacao";
import type { StatusAnuidade, TipoAssociado } from "../models";
import { calcularIdade, formatarDataNascimento } from "../utils/idade";
import { useAssociadosPagina } from "../hooks/useAssociadosPagina";
import styles from "./AssociadosPage.module.css";

const OPCOES_TIPO = [
  { value: "TITULAR", label: "Titular" },
  { value: "DEPENDENTE", label: "Dependente" },
];

const OPCOES_STATUS = [
  { value: "PAGO", label: "Pago" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "ISENTO", label: "Isento" },
];

const STATUS_ANUIDADE: Record<
  StatusAnuidade,
  { label: string; variant: string }
> = {
  PAGO: { label: "Pago", variant: "success" },
  PENDENTE: { label: "Pendente", variant: "warning" },
  ISENTO: { label: "Isento", variant: "muted" },
};

function tipoAssociado(tipo: TipoAssociado): string {
  return tipo === "TITULAR" ? "Titular" : "Dependente";
}

export default function AssociadosPage() {
  const {
    searchDraft,
    setSearchDraft,
    setPage,
    filtersOpen,
    setFiltersOpen,
    anoEscolhido,
    setAnoEscolhido,
    ano,
    tipo,
    setTipo,
    status,
    setStatus,
    idadeMin,
    setIdadeMin,
    idadeMax,
    setIdadeMax,
    associadosQuery,
    configuracoesQuery,
    opcoesAno,
    runSearch,
    clearFilters,
    clearAll,
    hasFilters,
  } = useAssociadosPagina();

  const { data, isLoading, isError, refetch } = associadosQuery;

  function alterarAno(valor: string) {
    const anoSelecionado = Number(valor);
    setAnoEscolhido(
      valor && Number.isInteger(anoSelecionado) ? anoSelecionado : null,
    );
  }

  function alterarTipo(valor: string) {
    setTipo(
      valor === "TITULAR" || valor === "DEPENDENTE"
        ? valor
        : undefined,
    );
  }

  function alterarStatus(valor: string) {
    setStatus(
      valor === "PAGO" || valor === "PENDENTE" || valor === "ISENTO"
        ? valor
        : undefined,
    );
  }

  return (
    <div className={styles.stack}>
      <PageHeader subtitle="Cadastre associados e acompanhe o pagamento das anuidades" />

      <BarraPesquisa
        value={searchDraft}
        onChange={setSearchDraft}
        onSubmit={runSearch}
        placeholder="Pesquisar associado ou titular..."
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        extra={
          <Selecao
            className={styles.yearSelect}
            label="Ano da anuidade"
            options={opcoesAno}
            value={String(anoEscolhido ?? opcoesAno[0]?.value ?? "")}
            onChange={(event) => alterarAno(event.target.value)}
            disabled={!opcoesAno.length}
          />
        }
      />

      {filtersOpen ? (
        <PainelFiltros onClear={clearFilters} columns={4}>
          <Entrada
            label="Idade a partir de"
            type="number"
            min={0}
            step={1}
            value={idadeMin}
            onChange={(event) => setIdadeMin(event.target.value)}
          />
          <Entrada
            label="Idade até"
            type="number"
            min={0}
            step={1}
            value={idadeMax}
            onChange={(event) => setIdadeMax(event.target.value)}
          />
          <Selecao
            label="Tipo"
            options={OPCOES_TIPO}
            placeholder="Todos"
            value={tipo ?? ""}
            onChange={(event) => alterarTipo(event.target.value)}
          />
          <Selecao
            label="Status da anuidade"
            options={OPCOES_STATUS}
            placeholder="Todos"
            value={status ?? ""}
            onChange={(event) => alterarStatus(event.target.value)}
          />
        </PainelFiltros>
      ) : null}

      {configuracoesQuery.isLoading || isLoading ? (
        <EstadoCarregando message="Carregando associados..." />
      ) : isError ? (
        <EstadoErro
          message="Não foi possível carregar os associados."
          onRetry={refetch}
        />
      ) : data ? (
        <>
          <div className={styles.summary}>
            <span>
              <strong>{data.total}</strong>{" "}
              {pluralizar("associado", data.total)}{" "}
              {pluralizar("encontrado", data.total)}
            </span>
            {ano !== undefined ? (
              <Etiqueta variant="neutral">Anuidade {ano}</Etiqueta>
            ) : null}
          </div>

          {data.items.length ? (
            <>
              <Tabela caption="Associados">
                <Cabecalho>
                  <Linha>
                    <CelulaCabecalho>Associado</CelulaCabecalho>
                    <CelulaCabecalho>Contato</CelulaCabecalho>
                    <CelulaCabecalho>Idade</CelulaCabecalho>
                    <CelulaCabecalho>Tipo</CelulaCabecalho>
                    <CelulaCabecalho>Anuidade</CelulaCabecalho>
                    <CelulaCabecalho numeric>Valor / pago</CelulaCabecalho>
                  </Linha>
                </Cabecalho>
                <Corpo>
                  {data.items.map((associado) => {
                    const anuidade = associado.anuidade;
                    const statusAnuidade = anuidade
                      ? STATUS_ANUIDADE[anuidade.status]
                      : null;

                    return (
                      <Linha key={associado.id}>
                        <Celula>
                          <div className={styles.associateCell}>
                            <span className={styles.avatar} aria-hidden="true">
                              {iniciais(associado.nome)}
                            </span>
                            <span>
                              <span className={styles.memberName}>
                                {associado.nome}
                              </span>
                              {associado.tipo === "DEPENDENTE" ? (
                                <span className={styles.secondary}>
                                  Dependente de{" "}
                                  {associado.titularNome || "titular não informado"}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </Celula>
                        <Celula>{associado.numeroContato}</Celula>
                        <Celula>
                          <span>{calcularIdade(associado.dataNascimento)} anos</span>
                          <span className={styles.secondary}>
                            {formatarDataNascimento(associado.dataNascimento)}
                          </span>
                        </Celula>
                        <Celula>
                          <Etiqueta variant="neutral">
                            {tipoAssociado(associado.tipo)}
                          </Etiqueta>
                        </Celula>
                        <Celula>
                          {associado.tipo === "DEPENDENTE" ? (
                            <Etiqueta variant="muted">
                              Incluído no titular
                            </Etiqueta>
                          ) : statusAnuidade ? (
                            <Etiqueta variant={statusAnuidade.variant}>
                              {statusAnuidade.label}
                            </Etiqueta>
                          ) : (
                            <Etiqueta variant="muted">Sem anuidade</Etiqueta>
                          )}
                        </Celula>
                        <Celula numeric>
                          {anuidade ? (
                            <>
                              <span>{formatarMoeda(anuidade.valor)}</span>
                              <span className={styles.secondary}>
                                {formatarMoeda(anuidade.totalPago)} recebido
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </Celula>
                      </Linha>
                    );
                  })}
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
                  ? "Nenhum associado encontrado."
                  : "Nenhum associado registrado."
              }
              icon="users"
              action={
                hasFilters ? (
                  <Botao variant="secondary" onClick={clearAll}>
                    Limpar filtros
                  </Botao>
                ) : null
              }
            />
          )}
        </>
      ) : (
        <EstadoCarregando message="Carregando associados..." />
      )}
    </div>
  );
}
