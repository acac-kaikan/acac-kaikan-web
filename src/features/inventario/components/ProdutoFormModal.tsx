import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { mensagemErro } from "@/shared/api/erros";
import Botao from "@/shared/components/Botao/Botao";
import AreaTexto from "@/shared/components/Formulario/AreaTexto";
import Entrada from "@/shared/components/Formulario/Entrada";
import Selecao from "@/shared/components/Formulario/Selecao";
import Icone from "@/shared/components/Icone/Icone";
import Modal from "@/shared/components/Modal/Modal";
import type { Produto } from "../models";
import {
  useCategoriasQuery,
  useProdutoMutations,
} from "../hooks/useInventario";
import styles from "./ModaisInventario.module.css";

const TIPOS_IMAGEM_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

interface ProdutoFormValues {
  nome: string;
  descricao?: string;
  categoryId: string;
  estoqueMinimo: number;
}

interface ProdutoFormModalProps {
  produto?: Produto; // se vier preenchido, o modal funciona em modo edição
  onClose: () => void;
  onCreated?: (produto: Produto) => void;
  onUpdated?: (produto: Produto) => void;
}

export default function ProdutoFormModal({
  produto,
  onClose,
  onCreated,
  onUpdated,
}: ProdutoFormModalProps) {
  const isEdit = Boolean(produto);
  const { data: categories, isLoading: categoriesLoading } =
    useCategoriasQuery();
  const { criarProduto, atualizarProduto } = useProdutoMutations();
  const mutation = isEdit ? atualizarProduto : criarProduto;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [image, setImage] = useState<string | null>(produto?.fotoUrl ?? null);
  const [imageName, setImageName] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProdutoFormValues>({
    mode: "onTouched",
    defaultValues: {
      nome: produto?.nome ?? "",
      descricao: produto?.descricao ?? "",
      categoryId:
        produto?.categoria?.id !== undefined ? String(produto.categoria.id) : "",
      estoqueMinimo: produto?.estoqueMinimo ?? 0,
    },
  });

  useEffect(() => {
    if (!categoriesLoading && produto?.categoria?.id) {
      setValue("categoryId", String(produto.categoria.id));
    }
  }, [categoriesLoading, produto?.categoria?.id, setValue]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!TIPOS_IMAGEM_ACEITOS.includes(file.type)) {
      setServerError("Formato de imagem não aceito. Use PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setImage(reader.result);
      setImageName(file.name);
      setArquivo(file);
      setServerError("");
    };
    reader.readAsDataURL(file);
  }

  const onSubmit: SubmitHandler<ProdutoFormValues> = async (values) => {
    setServerError("");
    try {
      if (produto) {
        const atualizado = await atualizarProduto.mutateAsync({
          id: produto.id,
          payload: {
            nome: values.nome,
            descricao: values.descricao,
            categoriaId: values.categoryId ? Number(values.categoryId) : undefined,
            estoqueMinimo: values.estoqueMinimo,
          },
          arquivo,
        });
        onUpdated?.(atualizado);
      } else {
        const criado = await criarProduto.mutateAsync({
          payload: {
            nome: values.nome,
            descricao: values.descricao,
            categoriaId: values.categoryId ? Number(values.categoryId) : undefined,
            estoqueMinimo: values.estoqueMinimo,
          },
          arquivo,
        });
        onCreated?.(criado);
      }
    } catch (error) {
      setServerError(
        mensagemErro(
          error,
          isEdit
            ? "Não foi possível atualizar o produto."
            : "Não foi possível criar o produto.",
        ),
      );
    }
  };

  const categoryOptions = (categories?.items || []).map((category) => ({
    value: String(category.id),
    label: category.nome,
  }));

  return (
    <Modal
      title={isEdit ? "Editar Produto" : "Criar Produto"}
      onClose={mutation.isPending ? undefined : onClose}
      showClose={!mutation.isPending}
      closeOnOverlay={!mutation.isPending}
      footer={
        <>
          <Botao
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form="form-produto"
            loading={mutation.isPending}
          >
            {isEdit ? "Salvar alterações" : "Criar Produto"}
          </Botao>
        </>
      }
    >
      <form
        id="form-produto"
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className={styles.uploadArea}>
          <span className={styles.uploadLabel}>Imagem</span>
          <div className={styles.uploadRow}>
            <div className={styles.imagePreview}>
              {image ? (
                <img src={image} alt="Pré-visualização do produto" />
              ) : (
                <Icone name="image" size={28} />
              )}
            </div>
            <div className={styles.uploadInfo}>
              <Botao
                variant="secondary"
                size="compact"
                iconLeft="upload"
                onClick={() => fileRef.current?.click()}
              >
                Upload
              </Botao>
              <p className={styles.hint}>
                {imageName ||
                  (isEdit && image
                    ? "Imagem atual. Clique em Upload para trocar."
                    : "PNG, JPG ou WEBP. A imagem é opcional.")}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={TIPOS_IMAGEM_ACEITOS.join(",")}
              className="sr-only"
              onChange={handleFile}
              aria-label="Selecionar imagem do produto"
            />
          </div>
        </div>

        <Entrada
          id="produto-nome"
          label="Nome"
          placeholder="Nome do produto"
          required
          error={errors.nome?.message}
          {...register("nome", {
            required: "Informe o nome do produto.",
            minLength: { value: 2, message: "Informe ao menos 2 caracteres." },
          })}
        />

        <AreaTexto
          id="produto-descricao"
          label="Descrição"
          rows={3}
          placeholder="Descrição do produto (opcional)"
          error={errors.descricao?.message}
          {...register("descricao")}
        />

        <div className={styles.twoColumns}>
          <Selecao
            id="produto-categoria"
            label="Categoria"
            placeholder={categoriesLoading ? "Carregando..." : "Selecione"}
            options={categoryOptions}
            disabled={categoriesLoading}
            required
            error={errors.categoryId?.message}
            {...register("categoryId", {
              required: "Selecione uma categoria.",
            })}
          />
          <Entrada
            id="produto-estoque-minimo"
            label="Estoque mínimo"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            error={errors.estoqueMinimo?.message}
            {...register("estoqueMinimo", {
              valueAsNumber: true,
              min: {
                value: 0,
                message: "O estoque mínimo não pode ser negativo.",
              },
              validate: (value) =>
                Number.isInteger(value) || "Informe um número inteiro.",
            })}
          />
        </div>

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
