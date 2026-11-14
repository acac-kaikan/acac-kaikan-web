import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import Modal from "@/shared/components/Modal/Modal";
import Botao from "@/shared/components/Botao/Botao";
import ControleSegmentado from "@/shared/components/Formulario/ControleSegmentado";
import Icone from "@/shared/components/Icone/Icone";
import { useToast } from "@/shared/components/Toast/ToastProvider";
import { useCaixaMutations } from "../hooks/useCaixa";
import { mensagemErro } from "@/shared/api/erros";
import { formatarMoeda } from "@/shared/lib/formatacao";
import type { Fiado } from "../models";
import styles from "./QuitarFiadoModal.module.css";

const PAYMENT_OPTIONS = [
  { value: "PIX", label: "PIX" },
  { value: "DEBITO", label: "Débito" },
  { value: "CREDITO", label: "Crédito" },
  { value: "DINHEIRO", label: "Dinheiro" },
];

interface QuitarFiadoModalProps {
  fiado: Fiado;
  onClose: () => void;
}

interface QuitarFiadoFormValues {
  paymentMethod: "PIX" | "DEBITO" | "CREDITO" | "DINHEIRO";
}

export default function QuitarFiadoModal({
  fiado,
  onClose,
}: QuitarFiadoModalProps) {
  const { addToast } = useToast();
  const { quitarFiado: settleFiado } = useCaixaMutations();
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuitarFiadoFormValues>({
    mode: "onTouched",
    defaultValues: {
      paymentMethod: "PIX",
    },
  });
  const payment = watch("paymentMethod");

  const onSubmit: SubmitHandler<QuitarFiadoFormValues> = async (values) => {
    try {
      const result = await settleFiado.mutateAsync({
        eventId: fiado.eventId,
        id: fiado.id,
        payload: {
          formaPagamento: values.paymentMethod,
        },
      });
      addToast(
        result.status === "settled"
          ? "Fiado quitado com sucesso."
          : "Fiado atualizado.",
      );
      onClose?.();
    } catch (error) {
      addToast(
        mensagemErro(error, "Não foi possível quitar o fiado."),
        "error",
      );
    }
  };

  return (
    <Modal
      title="Quitar fiado"
      subtitle="Confirme a quitação total e a forma de pagamento"
      onClose={settleFiado.isPending ? undefined : onClose}
      showClose={!settleFiado.isPending}
      closeOnOverlay={!settleFiado.isPending}
      size="small"
      footer={
        <>
          <Botao
            variant="secondary"
            onClick={onClose}
            disabled={settleFiado.isPending}
          >
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form="form-quitar-fiado"
            loading={settleFiado.isPending}
          >
            Quitar fiado
          </Botao>
        </>
      }
    >
      <form
        id="form-quitar-fiado"
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className={styles.context}>
          <div>
            <span>Devedor</span>
            <strong>{fiado.nomeDevedor}</strong>
          </div>
          <div>
            <span>Valor do fiado</span>
            <strong>{formatarMoeda(fiado.valor)}</strong>
          </div>
        </div>

        <ControleSegmentado
          label="Forma de pagamento"
          options={PAYMENT_OPTIONS}
          value={payment}
          onChange={(value) =>
            setValue("paymentMethod", value as QuitarFiadoFormValues["paymentMethod"])
          }
          columns={2}
        />

        {errors.paymentMethod ? (
          <p className={styles.fieldError} role="alert">
            <Icone name="alert-circle" size={16} />
            {errors.paymentMethod.message}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
