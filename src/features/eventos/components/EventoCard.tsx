import { Link } from "react-router-dom";
import Etiqueta from "@/shared/components/Etiqueta/Etiqueta";
import Botao from "@/shared/components/Botao/Botao";
import Icone from "@/shared/components/Icone/Icone";
import { formatarDataHora } from "@/shared/lib/formatacao";
import type { Evento, StatusEventoCodigo } from "../models";
import { rotuloTipoEvento, varianteStatus } from "../utils/statusEvento";
import styles from "./EventoCard.module.css";

interface EventoCardProps {
  event: Evento;
  highlighted?: boolean;
  busy?: boolean;
  onChangeStatus: (event: Evento, status: StatusEventoCodigo) => void;
  onDelete: (event: Evento) => void;
  onEdit: (event: Evento) => void;
}

export default function EventoCard({
  event,
  highlighted = false,
  busy = false,
  onChangeStatus,
  onDelete,
  onEdit,
}: EventoCardProps) {
  const status = event.status;
  const isOngoing = status.codigo === "EM_ANDAMENTO";
  const isClosed = status.codigo === "ENCERRADO";
  const isNotStarted = status.codigo === "NAO_INICIADO";

  return (
    <article
      className={`${styles.card} ${highlighted ? styles.highlighted : ""}`.trim()}
    >
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2 className={styles.name}>{event.nome}</h2>
          <div className={styles.badges}>
            <Etiqueta>{rotuloTipoEvento(event.tipoEvento)}</Etiqueta>
            <Etiqueta variant={varianteStatus(status.codigo)} dot>
              {status.descricao}
            </Etiqueta>
          </div>
        </div>
        <Icone
          name={event.tipoEvento === "REUNIAO" ? "users" : "ticket"}
          size={32}
          className={styles.icon}
        />
      </div>

      <dl className={styles.dates}>
        <div>
          <dt>Início</dt>
          <dd>{formatarDataHora(event.dataHoraInicio)}</dd>
        </div>
        <div>
          <dt>Encerramento</dt>
          <dd>{formatarDataHora(event.dataHoraEncerramento)}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <Botao
          as={Link}
          to={`/eventos/${event.id}`}
          variant="secondary"
          size="compact"
        >
          Ver detalhes
        </Botao>

        {isOngoing ? (
          <>
            <Botao
              as={Link}
              to="/registro-vendas"
              size="compact"
              iconLeft="bag"
            >
              Registro de vendas
            </Botao>
            <Botao
              as={Link}
              to="/caixa"
              variant="secondary"
              size="compact"
              iconLeft="cash"
            >
              Caixa
            </Botao>
            <Botao
              variant="secondary"
              size="compact"
              loading={busy}
              onClick={() => onChangeStatus(event, "ENCERRADO")}
            >
              Encerrar evento
            </Botao>
            <Botao
              variant="tertiary"
              size="compact"
              disabled={busy}
              onClick={() => onChangeStatus(event, "NAO_INICIADO")}
            >
              Desfazer início
            </Botao>
          </>
        ) : null}

        {isNotStarted ? (
          <Botao
            size="compact"
            loading={busy}
            onClick={() => onChangeStatus(event, "EM_ANDAMENTO")}
          >
            Iniciar evento
          </Botao>
        ) : null}

        {isClosed ? (
          <Botao
            size="compact"
            loading={busy}
            onClick={() => onChangeStatus(event, "EM_ANDAMENTO")}
          >
            Reabrir evento
          </Botao>
        ) : null}

        <Botao
          variant="tertiary"
          size="compact"
          onClick={() => onEdit(event)}
        >
          Editar evento
        </Botao>
        <Botao
          variant="danger"
          size="compact"
          iconLeft="trash"
          disabled={busy}
          onClick={() => onDelete?.(event)}
        >
          Excluir evento
        </Botao>
      </div>
    </article>
  );
}
