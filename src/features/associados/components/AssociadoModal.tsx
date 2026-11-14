import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import Modal from "@/shared/components/Modal/Modal";
import Botao from "@/shared/components/Botao/Botao";
import Entrada from "@/shared/components/Formulario/Entrada";
import Selecao from "@/shared/components/Formulario/Selecao";
import ControleSegmentado from "@/shared/components/Formulario/ControleSegmentado";
import Icone from "@/shared/components/Icone/Icone";
import { mensagemErro } from "@/shared/api/erros";
import { useToast } from "@/shared/components/Toast/ToastProvider";
import type {
  Associado,
  SalvarAssociadoPayload,
  TipoAssociado,
} from "../models";
import {
  useAssociadoMutations,
  useTitularesQuery,
} from "../hooks/useAssociados";
import styles from "./AssociadoModal.module.css";

const TIPO_OPTIONS = [
  { value: "TITULAR", label: "Titular" },
  { value: "DEPENDENTE", label: "Dependente" },
];

interface AssociadoModalProps {
  associado?: Associado;
  onClose: () => void;
}

interface AssociadoFormValues {
  nome: string;
  numeroContato: string;
  dataNascimento: string;
  tipo: TipoAssociado;
  titularId: string;
}

function dataAtualParaEntrada(): string {
  const hoje = new Date();
  const pad = (valor: number) => String(valor).padStart(2, "0");
  return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(
    hoje.getDate(),
  )}`;
}

export default function AssociadoModal({
  associado,
  onClose,
}: AssociadoModalProps) {
  const isEdit = Boolean(associado);
  const [serverError, setServerError] = useState("");
  const { addToast } = useToast();
  const { criarAssociado, atualizarAssociado } = useAssociadoMutations();
  const titularesQuery = useTitularesQuery();
  const isPending = criarAssociado.isPending || atualizarAssociado.isPending;
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssociadoFormValues>({
    mode: "onTouched",
    defaultValues: {
      nome: associado?.nome ?? "",
      numeroContato: associado?.numeroContato ?? "",
      dataNascimento: associado?.dataNascimento ?? "",
      tipo: associado?.tipo ?? "TITULAR",
      titularId:
        associado?.titularId !== null && associado?.titularId !== undefined
          ? String(associado.titularId)
          : "",
    },
  });

  const tipoSelecionado = watch("tipo");
  const hoje = dataAtualParaEntrada();
  const titularOptions = (titularesQuery.data ?? [])
    .filter((titular) => titular.id !== associado?.id)
    .map((titular) => ({
      value: String(titular.id),
      label: titular.nome,
    }));

  if (
    associado?.tipo === "DEPENDENTE" &&
    associado.titularId !== null &&
    associado.titularId !== associado.id &&
    !titularOptions.some(
      (option) => option.value === String(associado.titularId),
    )
  ) {
    titularOptions.push({
      value: String(associado.titularId),
      label: associado.titularNome || "Titular atual (indisponível)",
    });
  }

  const onSubmit: SubmitHandler<AssociadoFormValues> = async (values) => {
    setServerError("");
    const payload: SalvarAssociadoPayload = {
      nome: values.nome.trim(),
      numeroContato: values.numeroContato.trim(),
      dataNascimento: values.dataNascimento,
      tipo: values.tipo,
    };
    if (values.tipo === "DEPENDENTE") {
      payload.titularId = Number(values.titularId);
    }

    try {
      if (associado) {
        await atualizarAssociado.mutateAsync({
          id: associado.id,
          payload,
        });
        addToast("Informações do associado atualizadas.");
      } else {
        await criarAssociado.mutateAsync(payload);
        addToast("Associado registrado com sucesso.");
      }
      onClose();
    } catch (error) {
      setServerError(
        mensagemErro(
          error,
          isEdit
            ? "Não foi possível atualizar o associado."
            : "Não foi possível registrar o associado.",
        ),
      );
    }
  };

  return (
    <Modal
      title={isEdit ? "Editar associado" : "Registrar associado"}
      subtitle="Preencha os dados pessoais e o vínculo do associado."
      onClose={isPending ? undefined : onClose}
      showClose={!isPending}
      closeOnOverlay={!isPending}
      footer={
        <>
          <Botao
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form="form-associado"
            loading={isPending}
          >
            {isEdit ? "Salvar alterações" : "Registrar associado"}
          </Botao>
        </>
      }
    >
      <form
        id="form-associado"
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Entrada
          id="associado-nome"
          label="Nome completo"
          required
          error={errors.nome?.message}
          {...register("nome", {
            required: "Informe o nome completo.",
            validate: (value) =>
              Boolean(value.trim()) || "Informe o nome completo.",
          })}
        />
        <Entrada
          id="associado-contato"
          label="Número de contato"
          type="tel"
          placeholder="(00) 00000-0000"
          required
          error={errors.numeroContato?.message}
          {...register("numeroContato", {
            required: "Informe o número de contato.",
            validate: (value) => {
              const digitos = value.replace(/\D/g, "").length;
              return (
                digitos === 10 ||
                digitos === 11 ||
                "Informe um número de contato válido."
              );
            },
          })}
        />
        <Entrada
          id="associado-data-nascimento"
          label="Data de nascimento"
          type="date"
          max={hoje}
          required
          error={errors.dataNascimento?.message}
          {...register("dataNascimento", {
            required: "Informe a data de nascimento.",
            validate: (value) =>
              value <= hoje || "A data de nascimento não pode ser futura.",
          })}
        />
        <Controller
          name="tipo"
          control={control}
          rules={{ required: "Selecione o tipo de associado." }}
          render={({ field }) => (
            <ControleSegmentado
              label="Tipo de associado"
              options={TIPO_OPTIONS}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                setServerError("");
                if (value === "TITULAR") {
                  setValue("titularId", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              columns={2}
            />
          )}
        />
        {tipoSelecionado === "DEPENDENTE" ? (
          <Selecao
            id="associado-titular"
            label="Titular responsável"
            placeholder={
              titularesQuery.isLoading
                ? "Carregando titulares..."
                : "Selecione o titular"
            }
            options={titularOptions}
            disabled={titularesQuery.isLoading || titularesQuery.isError}
            required
            hint={
              titularesQuery.isError
                ? "Não foi possível carregar os titulares."
                : undefined
            }
            error={errors.titularId?.message}
            {...register("titularId", {
              required: "Selecione o titular responsável.",
              validate: (value) =>
                (Number(value) > 0 &&
                  Number(value) !== associado?.id &&
                  titularOptions.some((option) => option.value === value)) ||
                "Selecione o titular responsável.",
            })}
          />
        ) : null}
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
