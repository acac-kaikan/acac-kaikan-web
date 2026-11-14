export function calcularIdade(
  dataNascimento: string,
  hoje = new Date(),
): number {
  const [anoNascimento, mesNascimento, diaNascimento] = dataNascimento
    .split("-")
    .map(Number);
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const diaAtual = hoje.getDate();
  const aniversarioAindaNaoOcorreu =
    mesAtual < mesNascimento ||
    (mesAtual === mesNascimento && diaAtual < diaNascimento);

  return (
    anoAtual -
    anoNascimento -
    (aniversarioAindaNaoOcorreu ? 1 : 0)
  );
}

export function formatarDataNascimento(dataNascimento: string): string {
  const [ano, mes, dia] = dataNascimento.split("-");
  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`;
}
