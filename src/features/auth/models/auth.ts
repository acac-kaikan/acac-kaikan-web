export interface Usuario {
  nome: string;
  cargo: string;
  permissoes: string[]
}

export interface Sessao {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
}

export type TokensRenovados = Pick<Sessao, "accessToken" | "refreshToken">;

export interface Credenciais {
  email: string;
  senha: string;
}

export interface RedefinirSenhaPayload {
  token?: string;
  novaSenha: string;
}
