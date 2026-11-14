import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { mensagemErro } from "@/shared/api/erros";
import Botao from "@/shared/components/Botao/Botao";
import Entrada from "@/shared/components/Formulario/Entrada";
import Icone from "@/shared/components/Icone/Icone";
import { useAutenticacao } from "../hooks/useAutenticacao";
import styles from "./AuthPages.module.css";

interface LoginFormValues {
  email: string;
  senha: string;
}

export default function LoginPage() {
  const { entrar } = useAutenticacao();
  const navigate = useNavigate();
  const location = useLocation();
  const estado = location.state as
    | { from?: { pathname?: string }; sessaoExpirada?: boolean }
    | null;
  const [serverError, setServerError] = useState(
    estado?.sessaoExpirada ? "Sua sessão expirou. Entre novamente." : "",
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ mode: "onTouched" });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setServerError("");
    try {
      await entrar(values);
      const destination = estado?.from?.pathname || "/inicio";
      navigate(destination, { replace: true });
    } catch (error) {
      setServerError(mensagemErro(error, "Não foi possível entrar."));
    }
  };

  return (
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>Bem-vindo!</h1>
          <p className={styles.subtitle}>
            Faça login para acessar o sistema administrativo.
          </p>
        </header>

        <form
          className={styles.form}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Entrada
            id="login-email"
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com.br"
            error={errors.email?.message}
            required
            {...register("email", {
              required: "Informe seu e-mail.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Informe um e-mail válido.",
              },
            })}
          />

          <Entrada
            id="login-senha"
            label="Senha"
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            error={errors.senha?.message}
            required
            {...register("senha", {
              required: "Informe sua senha.",
            })}
          />

          <div className={styles.inlineAction}>
            <Link to="/recuperar-senha" className={styles.link}>
              Esqueci minha senha
            </Link>
          </div>

          {serverError ? (
            <p className={styles.serverError} role="alert">
              <Icone name="alert-circle" size={18} />
              {serverError}
            </p>
          ) : null}

          <Botao type="submit" loading={isSubmitting} className={styles.submit}>
            Entrar
          </Botao>
        </form>

        <p className={styles.demoNote}>
          Modo de demonstração: use qualquer e-mail válido e uma senha para
          acessar. Nenhuma credencial real é validada.
        </p>
      </div>
  );
}
