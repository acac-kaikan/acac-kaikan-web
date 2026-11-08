import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { mensagemErro } from "@/shared/api/erros";
import Botao from "@/shared/components/Botao/Botao";
import ConfirmacaoDialog from "@/shared/components/ConfirmacaoDialog/ConfirmacaoDialog";
import {
  EstadoCarregando,
  EstadoErro,
  EstadoVazio,
} from "@/shared/components/Estado/Estado";
import AreaTexto from "@/shared/components/Formulario/AreaTexto";
import Entrada from "@/shared/components/Formulario/Entrada";
import Icone from "@/shared/components/Icone/Icone";
import Modal from "@/shared/components/Modal/Modal";
import { useToast } from "@/shared/components/Toast/ToastProvider";
import { pluralizarCategoria } from "@/shared/lib/formatacao";
import type { Categoria } from "../models";
import {
  useCategoriaMutations,
  useCategoriasQuery,
} from "../hooks/useInventario";
import styles from "../components/ModaisInventario.module.css";

interface CategoriaFormValues {
  nome: string;
  descricao?: string;
}

interface FormularioCategoriaModalProps {
  categoria?: Categoria;
  onClose: () => void;
  onSaved: () => void;
}

function FormularioCategoriaModal({
  categoria,
  onClose,
  onSaved,
}: FormularioCategoriaModalProps) {
  const isEditing = Boolean(categoria);
  const { criarCategoria, atualizarCategoria } = useCategoriaMutations();
  const { addToast } = useToast();
  const [serverError, setServerError] = useState("");
  const isPending = isEditing
    ? atualizarCategoria.isPending
    : criarCategoria.isPending;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoriaFormValues>({
    mode: "onTouched",
      defaultValues: {
      nome: categoria?.nome || "",
      descricao: categoria?.descricao || "",
    },
  });

  const onSubmit: SubmitHandler<CategoriaFormValues> = async (values) => {
    setServerError("");
    try {
      if (isEditing && categoria) {
        await atualizarCategoria.mutateAsync({
          id: categoria.id,
          payload: values,
        });
        addToast("Categoria atualizada com sucesso.");
      } else {
        await criarCategoria.mutateAsync(values);
        addToast("Categoria criada com sucesso.");
      }
      onSaved();
    } catch (error) {
      setServerError(
        mensagemErro(
          error,
          isEditing
            ? "Não foi possível atualizar a categoria."
            : "Não foi possível criar a categoria.",
        ),
      );
    }
  };

  return (
    <Modal
      title={isEditing ? "Editar categoria" : "Criar categoria"}
      onClose={isPending ? undefined : onClose}
      showClose={!isPending}
      closeOnOverlay={!isPending}
      size="small"
      footer={
        <>
          <Botao variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-categoria" loading={isPending}>
            {isEditing ? "Salvar categoria" : "Criar categoria"}
          </Botao>
        </>
      }
    >
      <form
        id="form-categoria"
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Entrada
          id="categoria-nome"
          label="Nome"
          placeholder="Nome da categoria"
          required
          error={errors.nome?.message}
          {...register("nome", {
            required: "Informe o nome da categoria.",
            minLength: { value: 2, message: "Informe ao menos 2 caracteres." },
          })}
        />
        <AreaTexto
          id="categoria-descricao"
          label="Descrição"
          rows={3}
          placeholder="Descrição da categoria (opcional)"
          error={errors.descricao?.message}
          {...register("descricao")}
        />
        {serverError ? (
          <p className={styles.serverError} role="alert">
            <Icone name="alert-circle" size={18} />
            {serverError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

interface CategoriasModalProps {
  onClose: () => void;
}

type EstadoFormulario =
  | { mode: "create" }
  | { mode: "edit"; category: Categoria }
  | null;

export default function CategoriasModal({ onClose }: CategoriasModalProps) {
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<EstadoFormulario>(null);
  const [deleteTarget, setDeleteTarget] = useState<Categoria | null>(null);
  const { addToast } = useToast();
  const { excluirCategoria } = useCategoriaMutations();
  const { data, isLoading, isError, refetch } = useCategoriasQuery(search);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await excluirCategoria.mutateAsync(deleteTarget.id);
      addToast("Categoria excluída com sucesso.");
      setDeleteTarget(null);
    } catch (error) {
      addToast(
        mensagemErro(error, "Não foi possível excluir a categoria."),
        "error",
      );
    }
  }

  const items = data?.items || [];

  return (
    <>
      <Modal
        title="Menu de categorias"
        onClose={onClose}
        size="xlarge"
        footer={
          <Botao variant="secondary" onClick={onClose}>
            Fechar
          </Botao>
        }
      >
        <div className={styles.categories}>
          <div className={styles.categoriesToolbar}>
            <form
              className={styles.inlineSearch}
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(draftSearch);
              }}
            >
              <label className="sr-only" htmlFor="busca-categoria">
                Pesquisar categoria
              </label>
              <div className={styles.inlineSearchField}>
                <Icone name="search" size={18} />
                <input
                  id="busca-categoria"
                  type="search"
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                  placeholder="Pesquisar categoria..."
                />
              </div>
              <Botao variant="secondary" type="submit">
                Pesquisar
              </Botao>
            </form>
            <Botao
              iconLeft="plus"
              onClick={() => setFormState({ mode: "create" })}
            >
              Criar categoria
            </Botao>
          </div>

          {isLoading ? (
            <EstadoCarregando message="Carregando categorias..." />
          ) : isError ? (
            <EstadoErro
              message="Não foi possível carregar as categorias."
              onRetry={refetch}
            />
          ) : items.length === 0 ? (
            <EstadoVazio
              title={
                search
                  ? "Nenhuma categoria encontrada."
                  : "Nenhuma categoria cadastrada."
              }
              description={
                search
                  ? "Tente outro termo de pesquisa."
                  : "Crie a primeira categoria para organizar o estoque."
              }
              icon="ticket"
            />
          ) : (
            <ul className={styles.categoryList}>
              {items.map((category) => (
                <li key={category.id} className={styles.categoryItem}>
                  <div>
                     <h3 className={styles.categoryName}>{category.nome}</h3>
                     <p className={styles.categoryDescription}>
                      {category.descricao || "Sem descrição"}
                     </p>
                    {typeof category.quantidadeProdutos === "number" ? (
                      <p className={styles.categoryCount}>
                        {category.quantidadeProdutos}{" "}
                        {category.quantidadeProdutos === 1 ? "produto" : "produtos"} ·{" "}
                        {pluralizarCategoria(category.nome)}
                      </p>
                    ) : null}
                  </div>
                  <div className={styles.categoryActions}>
                    <Botao
                      variant="secondary"
                      size="compact"
                      iconLeft="edit"
                      onClick={() =>
                        setFormState({ mode: "edit", category })
                      }
                    >
                      Editar
                    </Botao>
                    <Botao
                      variant="danger"
                      size="compact"
                      iconLeft="trash"
                      onClick={() => setDeleteTarget(category)}
                    >
                      Excluir
                    </Botao>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {formState ? (
        <FormularioCategoriaModal
          categoria={
            formState.mode === "edit" ? formState.category : undefined
          }
          onClose={() => setFormState(null)}
          onSaved={() => setFormState(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmacaoDialog
          title="Excluir categoria"
          message={`Deseja excluir a categoria "${deleteTarget.nome}"?`}
          confirmLabel="Excluir"
          destructive
          loading={excluirCategoria.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}
