# Arquitetura do frontend

Este documento descreve a organização do frontend do Kaikan Cachoeira após a
refatoração por features. O objetivo é manter as páginas como containers finos,
concentrar estado e regras de tela em viewmodels e impedir dependências
circulares entre features.

## Árvore alvo

```text
src/
├── app/                         # composição da aplicação
│   ├── layouts/                 # AppLayout, AuthLayout
│   ├── pages/                   # páginas de infraestrutura
│   ├── providers/               # providers globais
│   └── routes/                  # AppRoutes, RotaProtegida
├── features/
│   ├── auth/
│   ├── caixa/
│   ├── doacoes/
│   ├── eventos/
│   ├── home/
│   ├── inventario/
│   └── vendas/
│       ├── components/
│       ├── domain/
│       ├── hooks/
│       ├── models/
│       ├── pages/
│       ├── providers/
│       ├── services/
│       ├── widgets/
│       └── index.ts             # barril público
├── shared/                      # código transversal, sem regra de feature
│   ├── api/
│   ├── components/
│   ├── lib/
│   ├── models/
│   ├── query/
│   └── styles/
└── main.tsx
```

Cada feature expõe apenas o seu `index.ts`. Imports externos devem usar
`@/features/<feature>`. Imports internos continuam relativos.

## DAG de dependências

```text
auth        (base)
inventario  (base)
eventos     -> inventario
doacoes     -> inventario, eventos
vendas      -> eventos
caixa       -> eventos
home        -> eventos
app         -> qualquer feature
shared      -> shared apenas
```

Regras complementares:

- `shared` não importa `features` nem `app`.
- Nenhuma feature importa `app`.
- `auth` e `inventario` não dependem de outras features.
- `eventos` não importa `vendas`; a página de vendas do evento pertence a
  `vendas`.
- O gráfico de vendas por hora da página de detalhes do evento é injetado pelo
  `AppRoutes` como composição. Assim `eventos` não passa a depender de `vendas`.

O DAG e os barris públicos são verificados por `dependency-cruiser`.

## Camadas por feature

| Camada | Responsabilidade |
| --- | --- |
| `pages` | Container fino: lê o viewmodel, escolhe estados de tela e compõe widgets. |
| `components` | Componentes de apresentação e formulários específicos da feature. |
| `widgets` | Blocos conectados reutilizáveis dentro da feature ou por consumidores via barril. |
| `hooks` | Viewmodels e hooks de dados (`*Query`, `*Mutations`). |
| `services` | Chamadas HTTP finas, retornando models diretamente. |
| `models` | Interfaces e tipos em português, com campos em inglês. |
| `domain` | Funções puras e regras isoladas, como o carrinho de vendas. |
| `providers` | Contextos globais da feature, como autenticação e carrinho. |

Não há camada de mapeamento: os services devolvem o formato consumido pelos
models.

## Convenções de nomes

- Código autoral em português: componentes, páginas, hooks, funções, variáveis e
  tipos.
- Termos estruturais permanecem em inglês: `App`, `Page`, `Query`, `Header`,
  `Sidebar`, `Layout`, `keys`, `Card`, `Modal`, `Toast`, `Provider`, `View`.
- `Mutation` não é traduzido: `useProdutoMutations`, `useEventoMutations`.
- CSS modules são sempre importados como `styles`.
- Páginas usam sufixo `Page`; views internas usam sufixo `View`.
- Consultas usam sufixo `Query`; mutações usam sufixo `Mutations`.
- Categorias, páginas e componentes legados foram traduzidos, por exemplo:
  `SearchBar` → `BarraPesquisa`, `ProductCard` → `ProdutoCard`,
  `InventoryPage` → `InventarioPage`, `EventDetailsPage` →
  `EventoDetalhesPage`, `RotasApp` → `AppRoutes`, `NaoEncontradaPage` →
  `PaginaNaoEncontrada`.

## Query keys

As chaves ficam em `src/shared/query/keys.ts`, organizadas pelos namespaces
`produtos`, `categorias`, `eventos`, `vendas`, `caixa`, `fiados` e `doacoes`.
Hooks e mutações compõem as chaves com `comporChave`, evitando arrays literais
espalhados pelo código.

## Comandos de verificação

```bash
npm test                 # testes unitários do domínio
npm run typecheck        # TypeScript estrito
npm run lint             # oxlint
npm run lint:boundaries  # DAG, barris públicos e ciclos
npm run build            # build de produção
```

O gate completo é:

```bash
npm test && npm run typecheck && npm run lint && npm run lint:boundaries && npm run build
```

## Decisões relevantes

- TypeScript estrito, sem `allowJs`.
- Alias `@/*` configurado no Vite e no `tsconfig.app.json`.
- `VendaProvider` mantém o carrinho; a matemática fica em
  `features/vendas/domain/carrinho.ts` e é coberta por Vitest.
- `CategoriasModal` é um widget conectado de `inventario`, consumido por
  `eventos` via barril público.
- Tokens de autenticação são ligados ao cliente HTTP por `definirToken`.
- O cliente expõe `definirRenovadorDeToken`; em `401` de uma rota protegida ele
  renova o access token e repete a requisição original uma única vez. A política
  de sessão, a persistência e a rotação do refresh token ficam em
  `features/auth`; `shared` não conhece a chave de armazenamento.
- Uma única renovação atende aos `401`s simultâneos (single-flight), e as rotas
  `/auth/*` nunca disparam renovação.
- O modo demo é selecionável no cliente compartilhado e mantém os mesmos dados e
  endpoints, incluindo login, refresh e logout.
