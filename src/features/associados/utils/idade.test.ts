import { describe, expect, it } from "vitest";
import { calcularIdade, formatarDataNascimento } from "./idade";

describe("idade", () => {
  const hoje = new Date(2026, 4, 15);

  it("considera o aniversário de hoje", () => {
    expect(calcularIdade("2000-05-15", hoje)).toBe(26);
  });

  it("não antecipa um aniversário que será amanhã", () => {
    expect(calcularIdade("2000-05-16", hoje)).toBe(25);
  });

  it("considera completo o aniversário que foi ontem", () => {
    expect(calcularIdade("2000-05-14", hoje)).toBe(26);
  });

  it("calcula corretamente uma data de nascimento em ano bissexto", () => {
    expect(calcularIdade("2000-02-29", new Date(2024, 1, 28))).toBe(23);
    expect(calcularIdade("2000-02-29", new Date(2024, 1, 29))).toBe(24);
  });

  it("formata a data pelas partes sem conversão para Date", () => {
    expect(formatarDataNascimento("1990-02-05")).toBe("05/02/1990");
  });
});
