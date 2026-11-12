import { useEffect, useRef, useState } from "react";
import Botao from "@/shared/components/Botao/Botao";
import Etiqueta from "@/shared/components/Etiqueta/Etiqueta";
import Icone from "@/shared/components/Icone/Icone";
import MiniaturaProduto from "@/shared/components/MiniaturaProduto/MiniaturaProduto";
import { formatarNumero } from "@/shared/lib/formatacao";
import type { Produto } from "../models";
import styles from "./ProdutoCard.module.css";

interface ProdutoCardProps {
  produto: Produto;
  onDetails?: (produto: Produto) => void;
  onMovement?: (produto: Produto) => void;
  onEdit?: (produto: Produto) => void;
  onDelete?: (produto: Produto) => void;
}

export default function ProdutoCard({
  produto,
  onDetails,
  onMovement,
  onEdit,
  onDelete,
}: ProdutoCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const outOfStock = Number(produto.quantidadeAtual) === 0;
  const lowStock =
    !outOfStock &&
    produto.estoqueMinimo !== null &&
    produto.estoqueMinimo !== undefined &&
    Number(produto.quantidadeAtual) <= Number(produto.estoqueMinimo);

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <MiniaturaProduto
          src={produto.fotoUrl}
          alt={`Imagem de ${produto.nome}`}
        />
        <div className={styles.info}>
          <div className={styles.titleRow}>
            <h3 className={styles.name}>{produto.nome}</h3>
            <div className={styles.menuWrap} ref={menuRef}>
              <button
                ref={triggerRef}
                type="button"
                className={styles.menuButton}
                aria-label={`Mais opções de ${produto.nome}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
              >
                <Icone name="more-vertical" size={20} />
              </button>
              {menuOpen ? (
                <div className={styles.menu} role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit?.(produto);
                    }}
                  >
                    <Icone name="edit" size={24} />
                    Editar produto
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.dangerItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.(produto);
                    }}
                  >
                    <Icone name="trash" size={24} />
                    Excluir produto
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <p className={styles.category}>
            {produto.categoria?.nome || "Sem categoria"}
          </p>
          <div className={styles.stockRow}>
            <span className={styles.quantity}>
              {formatarNumero(produto.quantidadeAtual)}{" "}
              {Number(produto.quantidadeAtual) === 1 ? "unidade" : "unidades"}
            </span>
            {outOfStock ? (
              <Etiqueta variant="danger" dot>
                Sem estoque
              </Etiqueta>
            ) : lowStock ? (
              <Etiqueta variant="warning" dot>
                Estoque baixo
              </Etiqueta>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Botao
          variant="secondary"
          size="compact"
          onClick={() => onDetails?.(produto)}
        >
          Ver detalhes
        </Botao>
        <Botao size="compact" onClick={() => onMovement?.(produto)}>
          Movimentar
        </Botao>
      </div>
    </article>
  );
}
