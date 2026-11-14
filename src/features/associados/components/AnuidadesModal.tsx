import { useState } from "react";
import Modal from "@/shared/components/Modal/Modal";
import Botao from "@/shared/components/Botao/Botao";
import Icone from "@/shared/components/Icone/Icone";
import ConfirmacaoDialog from "@/shared/components/ConfirmacaoDialog/ConfirmacaoDialog";
import {
  EstadoCarregando,
  EstadoErro,
  EstadoVazio,
} from "@/shared/components/Estado/Estado";
import { useToast } from "@/shared/components/Toast/ToastProvider";
import { mensagemErro } from "@/shared/api/erros";
import { formatarMoeda, pluralizar } from "@/shared/lib/formatacao";
import type { ConfiguracaoAnuidade } from "../models";
import {
  useConfiguracaoAnuidadeMutations,
  useConfiguracoesAnuidadeQuery,
} from "../hooks/useAnuidades";
import styles from "./AnuidadesModal.module.css";

interface AnuidadesModalProps {
  onClose: () => void;
  onCriar: () => void;
  onEditar: (configuracao: ConfiguracaoAnuidade) => void;
  onConfiguracaoExcluida: (ano: number) => void;
}

export default function AnuidadesModal({
  onClose,
  onCriar,
  onEditar,
  onConfiguracaoExcluida,
}: AnuidadesModalProps) {
  const configuracoesQuery = useConfiguracoesAnuidadeQuery();
  const { excluirConfiguracao } = useConfiguracaoAnuidadeMutations();
  const { addToast } = useToast();
  const [configuracaoExcluir, setConfiguracaoExcluir] =
    useState<ConfiguracaoAnuidade | null>(null);
  const configuracoes = configuracoesQuery.data ?? [];
  const isPending = excluirConfiguracao.isPending;

  async function confirmarExclusao() {
    if (!configuracaoExcluir) return;

    try {
      await excluirConfiguracao.mutateAsync(configuracaoExcluir.id);
      addToast(`Anuidade ${configuracaoExcluir.ano} excluída.`);
      onConfiguracaoExcluida(configuracaoExcluir.ano);
      setConfiguracaoExcluir(null);
    } catch (error) {
      addToast(mensagemErro(error, "Não foi possível excluir a anuidade."), "error");
    }
  }

  return (
    <>
      <Modal
        title="Anuidades"
        subtitle="Valores configurados por ano."
        onClose={isPending ? undefined : onClose}
        showClose={!isPending}
        closeOnOverlay={!isPending}
        size="large"
        footer={
          <Botao
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Fechar
          </Botao>
        }
      >
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <span>
              <strong>{configuracoes.length}</strong>{" "}
              {pluralizar(
                "configuração",
                configuracoes.length,
                "configurações",
              )}{" "}
              {pluralizar("cadastrada", configuracoes.length)}
            </span>
            <Botao iconLeft="plus" onClick={onCriar}>
              Criar anuidade
            </Botao>
          </div>

          {configuracoesQuery.isLoading ? (
            <EstadoCarregando message="Carregando anuidades..." />
          ) : configuracoesQuery.isError ? (
            <EstadoErro
              message="Não foi possível carregar as anuidades."
              onRetry={() => configuracoesQuery.refetch()}
            />
          ) : configuracoes.length === 0 ? (
            <EstadoVazio title="Nenhuma anuidade configurada." icon="calendar" />
          ) : (
            <ul className={styles.list}>
              {configuracoes.map((configuracao) => (
                <li className={styles.row} key={configuracao.id}>
                  <Icone
                    name="calendar"
                    size={22}
                    className={styles.calendar}
                  />
                  <div className={styles.details}>
                    <strong>{configuracao.ano}</strong>
                    <span>{formatarMoeda(configuracao.valor)}</span>
                  </div>
                  <div className={styles.actions}>
                    <Botao
                      variant="secondary"
                      size="compact"
                      iconLeft="edit"
                      aria-label={`Editar anuidade ${configuracao.ano}`}
                      onClick={() => onEditar(configuracao)}
                    />
                    <Botao
                      variant="secondary"
                      size="compact"
                      iconLeft="trash"
                      aria-label={`Excluir anuidade ${configuracao.ano}`}
                      onClick={() => setConfiguracaoExcluir(configuracao)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
      {configuracaoExcluir ? (
        <ConfirmacaoDialog
          title="Excluir anuidade"
          message={`As cobranças e os pagamentos de ${configuracaoExcluir.ano} também serão excluídos. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir anuidade"
          destructive
          loading={isPending}
          onConfirm={confirmarExclusao}
          onCancel={() => {
            if (!isPending) setConfiguracaoExcluir(null);
          }}
        />
      ) : null}
    </>
  );
}
