import { NavLink } from "react-router-dom";
import Logo from "@/shared/components/Logo/Logo";
import Icone from "@/shared/components/Icone/Icone";
import { useAutenticacao } from "@/features/auth";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { to: "/inicio", label: "Início", icon: "home", end: true },
  { to: "/associados", label: "Associados", icon: "users" },
  { to: "/estoque", label: "Estoque", icon: "box" },
  { to: "/eventos", label: "Eventos", icon: "ticket" },
  { to: "/doacoes", label: "Doações", icon: "gift" },
  {
    to: "/relatorio-geral",
    label: "Relatório geral",
    icon: "chart",
  },
  { to: "/registro-vendas", label: "Registro de vendas", icon: "bag" },
  { to: "/caixa", label: "Caixa", icon: "cash" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNavigate: () => void;
}

export default function Sidebar({ open, onClose, onNavigate }: SidebarProps) {
  const { usuario, sair } = useAutenticacao();
  const initials:string | undefined = usuario?.nome.slice(0, 2).toUpperCase() || "AD";

  return (
    <aside
      className={`${styles.sidebar} ${open ? styles.open : ""}`}
      aria-label="Navegação principal"
    >
      <div className={styles.top}>
        <div className={styles.brandRow}>
          <Logo />
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <Icone name="x" size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `${styles.link} ${isActive ? styles.active : ""}`.trim()
                  }
                >
                  <Icone name={item.icon} size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.userArea}>
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            {initials}
          </span>
          <span className={styles.userText}>
            <span className={styles.userName}>{usuario?.nome || "Administrador"}</span>
            <span className={styles.userEmail}>
              {usuario?.cargo || "conta compartilhada"}
            </span>
          </span>
        </div>
        <button type="button" className={styles.signOut} onClick={sair}>
          <Icone name="logout" size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
