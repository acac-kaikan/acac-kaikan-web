import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { demoAdapter } from "./demo/adaptador";

export const modoDemoAtivo = import.meta.env.VITE_DEMO_MODE === "true";

export type RenovadorDeToken = (tokenUsado: string | null) => Promise<string>;

interface ConfigComRenovacao extends InternalAxiosRequestConfig {
  _tentativaRenovacao?: boolean;
}

export interface ClienteApi {
  api: AxiosInstance;
  definirToken: (token: string | null) => void;
  definirRenovadorDeToken: (renovador: RenovadorDeToken | null) => void;
}

function caminhoDe(url: string | undefined): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url.split("?")[0];
}

function ehRotaDeAutenticacao(url: string | undefined): boolean {
  const caminho = caminhoDe(url);
  return caminho === "/auth" || caminho.startsWith("/auth/");
}

function extrairBearer(
  headers: InternalAxiosRequestConfig["headers"],
): string | null {
  const bruto = headers?.Authorization;
  if (typeof bruto !== "string") return null;
  const correspondencia = bruto.match(/^Bearer\s+(.+)$/i);
  return correspondencia ? correspondencia[1] : null;
}

export function criarCliente(): ClienteApi {
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
    timeout: 20000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (modoDemoAtivo) {
    api.defaults.adapter = demoAdapter;
  }

  let tokenAtual: string | null = null;
  let renovador: RenovadorDeToken | null = null;
  let renovacaoEmAndamento: Promise<string> | null = null;

  function definirToken(token: string | null) {
    tokenAtual = token;
  }

  function definirRenovadorDeToken(novoRenovador: RenovadorDeToken | null) {
    renovador = novoRenovador;
  }

  function renovarUmaVez(tokenUsado: string | null): Promise<string> {
    if (!renovador) {
      return Promise.reject(
        new Error("Renovador de token não configurado."),
      );
    }
    if (!renovacaoEmAndamento) {
      renovacaoEmAndamento = renovador(tokenUsado).finally(() => {
        renovacaoEmAndamento = null;
      });
    }
    return renovacaoEmAndamento;
  }

  api.interceptors.request.use((config) => {
    if (tokenAtual) {
      config.headers.Authorization = `Bearer ${tokenAtual}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error: unknown): Promise<AxiosResponse> => {
      if (!axios.isAxiosError(error)) throw error;

      const config = error.config as ConfigComRenovacao | undefined;
      if (!config || error.response?.status !== 401) throw error;
      if (config._tentativaRenovacao) throw error;
      if (ehRotaDeAutenticacao(config.url)) throw error;
      if (!renovador) throw error;

      const tokenUsado = extrairBearer(config.headers);
      const novoToken = await renovarUmaVez(tokenUsado);

      definirToken(novoToken);
      config._tentativaRenovacao = true;
      config.headers.Authorization = `Bearer ${novoToken}`;
      return api.request(config);
    },
  );

  return { api, definirToken, definirRenovadorDeToken };
}

const cliente = criarCliente();

export const api = cliente.api;
export const definirToken = cliente.definirToken;
export const definirRenovadorDeToken = cliente.definirRenovadorDeToken;

export default api;
