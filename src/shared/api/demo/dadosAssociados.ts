export type TipoAssociadoDemo = "TITULAR" | "DEPENDENTE";
export type StatusAnuidadeDemo = "PAGO" | "PENDENTE" | "ISENTO";

export interface AssociadoDemo {
  id: number;
  nome: string;
  numeroContato: string;
  dataNascimento: string;
  tipo: TipoAssociadoDemo;
  titularId: number | null;
  titularNome: string | null;
}

export interface ConfiguracaoAnuidadeDemo {
  id: number;
  ano: number;
  valor: number;
}

export interface AnuidadeDemo {
  id: number;
  associadoId: number;
  ano: number;
  valor: number;
  status: StatusAnuidadeDemo;
}

export interface PagamentoAnuidadeDemo {
  id: number;
  anuidadeId: number;
  valor: number;
}

export interface DadosAssociadosDemo {
  associados: AssociadoDemo[];
  configuracoes: ConfiguracaoAnuidadeDemo[];
  anuidades: AnuidadeDemo[];
  pagamentos: PagamentoAnuidadeDemo[];
}

export function criarSeedAssociados(): DadosAssociadosDemo {
  const associados: AssociadoDemo[] = [
    {
      id: 1,
      nome: "Hiroshi Tanaka",
      numeroContato: "(11) 91234-5601",
      dataNascimento: "1952-03-14",
      tipo: "TITULAR",
      titularId: null,
      titularNome: null,
    },
    {
      id: 2,
      nome: "Maria Sato",
      numeroContato: "(11) 91234-5602",
      dataNascimento: "1964-08-21",
      tipo: "TITULAR",
      titularId: null,
      titularNome: null,
    },
    {
      id: 3,
      nome: "Kenji Yamamoto",
      numeroContato: "(11) 91234-5603",
      dataNascimento: "1982-01-30",
      tipo: "TITULAR",
      titularId: null,
      titularNome: null,
    },
    {
      id: 4,
      nome: "Yuki Nakamura",
      numeroContato: "(11) 91234-5604",
      dataNascimento: "1991-11-05",
      tipo: "TITULAR",
      titularId: null,
      titularNome: null,
    },
    {
      id: 5,
      nome: "Paulo Kobayashi",
      numeroContato: "(11) 91234-5605",
      dataNascimento: "1974-04-17",
      tipo: "TITULAR",
      titularId: null,
      titularNome: null,
    },
    {
      id: 6,
      nome: "Naomi Suzuki",
      numeroContato: "(11) 91234-5606",
      dataNascimento: "1988-07-09",
      tipo: "TITULAR",
      titularId: null,
      titularNome: null,
    },
    {
      id: 7,
      nome: "Takeshi Mori",
      numeroContato: "(11) 91234-5607",
      dataNascimento: "1946-02-02",
      tipo: "TITULAR",
      titularId: null,
      titularNome: null,
    },
    {
      id: 8,
      nome: "João Watanabe",
      numeroContato: "(11) 91234-5608",
      dataNascimento: "1999-12-12",
      tipo: "TITULAR",
      titularId: null,
      titularNome: null,
    },
    {
      id: 9,
      nome: "Emi Tanaka",
      numeroContato: "(11) 91234-5609",
      dataNascimento: "2012-05-22",
      tipo: "DEPENDENTE",
      titularId: 1,
      titularNome: "Hiroshi Tanaka",
    },
    {
      id: 10,
      nome: "Lucas Sato",
      numeroContato: "(11) 91234-5610",
      dataNascimento: "2009-12-03",
      tipo: "DEPENDENTE",
      titularId: 2,
      titularNome: "Maria Sato",
    },
    {
      id: 11,
      nome: "Sofia Yamamoto",
      numeroContato: "(11) 91234-5611",
      dataNascimento: "2018-09-11",
      tipo: "DEPENDENTE",
      titularId: 3,
      titularNome: "Kenji Yamamoto",
    },
    {
      id: 12,
      nome: "Ren Watanabe",
      numeroContato: "(11) 91234-5612",
      dataNascimento: "2014-06-07",
      tipo: "DEPENDENTE",
      titularId: 8,
      titularNome: "João Watanabe",
    },
  ];

  const anuidades: AnuidadeDemo[] = [
    { id: 101, associadoId: 1, ano: 2025, valor: 120, status: "PAGO" },
    { id: 102, associadoId: 2, ano: 2025, valor: 120, status: "PAGO" },
    { id: 103, associadoId: 3, ano: 2025, valor: 120, status: "PAGO" },
    { id: 104, associadoId: 4, ano: 2025, valor: 120, status: "PAGO" },
    { id: 105, associadoId: 5, ano: 2025, valor: 120, status: "PAGO" },
    { id: 106, associadoId: 6, ano: 2025, valor: 120, status: "PAGO" },
    { id: 107, associadoId: 7, ano: 2025, valor: 120, status: "PENDENTE" },
    { id: 108, associadoId: 8, ano: 2025, valor: 120, status: "PAGO" },
    { id: 201, associadoId: 1, ano: 2026, valor: 150, status: "PAGO" },
    { id: 202, associadoId: 2, ano: 2026, valor: 150, status: "PAGO" },
    { id: 203, associadoId: 3, ano: 2026, valor: 150, status: "PENDENTE" },
    { id: 204, associadoId: 4, ano: 2026, valor: 150, status: "PENDENTE" },
    { id: 205, associadoId: 5, ano: 2026, valor: 150, status: "ISENTO" },
    { id: 206, associadoId: 6, ano: 2026, valor: 150, status: "PAGO" },
    { id: 207, associadoId: 7, ano: 2026, valor: 150, status: "PENDENTE" },
    { id: 208, associadoId: 8, ano: 2026, valor: 150, status: "PAGO" },
  ];

  return {
    associados,
    configuracoes: [
      { id: 1, ano: 2025, valor: 120 },
      { id: 2, ano: 2026, valor: 150 },
    ],
    anuidades,
    pagamentos: [
      { id: 1001, anuidadeId: 101, valor: 120 },
      { id: 1002, anuidadeId: 102, valor: 120 },
      { id: 1003, anuidadeId: 103, valor: 120 },
      { id: 1004, anuidadeId: 104, valor: 120 },
      { id: 1005, anuidadeId: 105, valor: 120 },
      { id: 1006, anuidadeId: 106, valor: 120 },
      { id: 1007, anuidadeId: 108, valor: 120 },
      { id: 2001, anuidadeId: 201, valor: 150 },
      { id: 2002, anuidadeId: 202, valor: 150 },
      { id: 2003, anuidadeId: 204, valor: 20 },
      { id: 2004, anuidadeId: 204, valor: 30 },
      { id: 2005, anuidadeId: 206, valor: 150 },
      { id: 2006, anuidadeId: 208, valor: 150 },
    ],
  };
}
