import { describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@/shared/api/cliente", () => ({
  default: { post },
}));

import { renovarTokens } from "./autenticacao";

describe("renovação de tokens", () => {
  it("envia o refresh token e devolve o par renovado", async () => {
    const renovado = {
      accessToken: "novo-access",
      refreshToken: "novo-refresh",
    };
    post.mockResolvedValueOnce({ data: renovado });

    const resultado = await renovarTokens("refresh-antigo");

    expect(post).toHaveBeenCalledWith("/auth/refresh", {
      refreshToken: "refresh-antigo",
    });
    expect(resultado).toEqual(renovado);
  });
});
