import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import Modal from "@/shared/components/Modal/Modal";
import Botao from "@/shared/components/Botao/Botao";
import Entrada from "@/shared/components/Formulario/Entrada";
import CampoMoeda from "@/shared/components/Formulario/CampoMoeda";
import Icone from "@/shared/components/Icone/Icone";
import { mensagemErro } from "@/shared/api/erros";
import { useToast } from "@/shared/components/Toast/ToastProvider";
import type {
  ConfiguracaoAnuidade,
  SalvarConfiguracaoAnuidadePayload,
} from "../models";
import { useConfiguracaoAnuidadeMutations } from "../hooks/useAnuidades";
import styles from "./ConfiguracaoAnuidadeModal.module.css";

interface ConfiguracaoAnuidadeModalProps {
  configuracao?: ConfiguracaoAnuidade;
  onClose: () => void;
  onCreated?: (configuracao: ConfiguracaoAnuidade) => void;
}

interface ConfiguracaoAnuidadeFormValues {
  ano: number;
  valor: number | undefined;
}

export default function ConfiguracaoAnuidadeModal({
  configuracao,
  onClose,
  onCreated,
}: ConfiguracaoAnuidadeModalProps) {
  const isEdit = Boolean(configuracao);
  const [serverError, setServerError] = useState("");
  const { addToast } = useToast();
  const { criarConfiguracao, atualizarConfiguracao } =
    useConfiguracaoAnuidadeMutations();
  const isPending =
    criarConfiguracao.isPending || atualizarConfiguracao.isPending;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ConfiguracaoAnuidadeFormValues>({
    mode: "onTouched",
    defaultValues: {
      ano: configuracao?.ano ?? new Date().getFullYear(),
      valor: configuracao?.valor,
    },
  });

  const onSubmit: SubmitHandler<ConfiguracaoAnuidadeFormValues> = async (
    values,
  ) => {
    setServerError("");
    const payload: SalvarConfiguracaoAnuidadePayload = {
      ano: values.ano,
      valor: Number(values.valor),
    };

    try {
      const salva = configuracao
        ? await atualizarConfiguracao.mutateAsync({
            id: configuracao.id,
            payload,
          })
        : await criarConfiguracao.mutateAsync(payload);
      if (configuracao) {
        addToast("Configuração de anuidade atualizada.");
      } else {
        addToast(`Anuidade de ${salva.ano} criada.`);
        onCreated?.(salva);
      }
      onClose();
    } catch (error) {
      setServerError(
        mensagemErro(
          error,
          isEdit
            ? "Não foi possível atualizar a configuração de anuidade."
            : "Não foi possível criar a configuração de anuidade.",
        ),
      );
    }
  };

  return (
    <Modal
      title="Anuidades"
      subtitle={
        isEdit
          ? "Edite a configuração do ano."
          : "Configure uma anuidade para um novo ano."
      }
      onClose={isPending ? undefined : onClose}
      showClose={!isPending}
      closeOnOverlay={!isPending}
      size="small"
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
            form="form-configuracao-anuidade"
            loading={isPending}
          >
            {isEdit ? "Salvar alterações" : "Criar anuidade"}
          </Botao>
        </>
      }
    >
      <form
        id="form-configuracao-anuidade"
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Entrada
          id="configuracao-anuidade-ano"
          label="Ano"
          type="number"
          min={2000}
          max={2100}
          step={1}
          required
          error={errors.ano?.message}
          {...register("ano", {
            valueAsNumber: true,
            required: "Informe o ano da anuidade.",
            validate: (valor) =>
              (Number.isInteger(valor) && valor >= 2000 && valor <= 2100) ||
              "Informe um ano entre 2000 e 2100.",
          })}
        />
        <Controller
          name="valor"
          control={control}
          rules={{
            validate: (valor) =>
              (typeof valor === "number" &&
                Number.isFinite(valor) &&
                valor >= 0) ||
              "Informe um valor válido para a anuidade.",
          }}
          render={({ field }) => (
            <CampoMoeda
              id="configuracao-anuidade-valor"
              label="Valor da anuidade"
              required
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              error={errors.valor?.message}
            />
          )}
        />
        <p className={styles.notice}>
          <Icone name="info" size={18} />
          {isEdit
            ? "Cobranças já geradas mantêm seus valores; esta alteração atualiza a configuração do ano."
            : "Ao criar, uma cobrança pendente será gerada para cada associado titular."}
        </p>
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
