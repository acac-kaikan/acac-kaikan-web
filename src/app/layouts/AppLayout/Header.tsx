import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Icone from "@/shared/components/Icone/Icone";
import { useAutenticacao } from "@/features/auth";
import styles from "./Header.module.css";

const TITLES = [
  { pattern: /^\/inicio/, title: "Início" },
  { pattern: /^\/associados/, title: "Associados" },
  { pattern: /^\/estoque/, title: "Estoque" },
  { pattern: /^\/doacoes/, title: "Doações" },
  { pattern: /^\/eventos/, title: "Eventos" },
  { pattern: /^\/registro-vendas/, title: "Registro de vendas" },
  { pattern: /^\/caixa/, title: "Caixa" },
  { pattern: /^\/relatorio-geral/, title: "Relatório geral" },
  { pattern: /^\/em-definicao/, title: "Em definição" },
];

interface HeaderProps {
  onOpenMenu: () => void;
}

export default function Header({ onOpenMenu }: HeaderProps) {
  const { usuario, sair } = useAutenticacao();
  const initials:string | undefined = usuario?.nome.slice(0, 2).toUpperCase() || "AD";
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const pageTitle =
    TITLES.find((item) => item.pattern.test(location.pathname))?.title ||
    "Kaikan Cachoeira";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onOpenMenu}
          aria-label="Abrir menu de navegação"
        >
          <Icone name="menu" size={22} />
        </button>
        <p className={styles.title}>{pageTitle}</p>
      </div>

      <div className={styles.userArea} ref={menuRef}>
        <button
          ref={buttonRef}
          type="button"
          className={styles.userButton}
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          <span className={styles.userText}>
            <span className={styles.userName}>
              {usuario?.nome || "Administrador"}
            </span>
            <span className={styles.userEmail}>
              {usuario?.cargo || "conta compartilhada"}
            </span>
          </span>
          <span className={styles.avatar} aria-hidden="true">
            {initials || "AD"}
          </span>
          <Icone name={menuOpen ? "chevron-up" : "chevron-down"} size={18} />
        </button>

        {menuOpen ? (
          <div className={styles.popover}>
            <div className={styles.popoverIdentity}>
              <span className={styles.avatar} aria-hidden="true">
                {initials || "AD"}
              </span>
              <div>
                <p className={styles.popoverName}>
                  {usuario?.nome || "Administrador"}
                </p>
                <p className={styles.popoverEmail}>
                  {usuario?.cargo || "conta compartilhada"}
                </p>
              </div>
            </div>
            <p className={styles.accountLabel}>
              {usuario?.cargo ? `Perfil: ${usuario.cargo}` : "Conta compartilhada"}
            </p>
            <button type="button" className={styles.logout} onClick={sair}>
              <Icone name="logout" size={18} />
              Sair
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
