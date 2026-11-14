# Proposal

## Why

O access token expira em 15 minutos. Depois disso, qualquer requisição a uma rota protegida recebe `401 NAO_AUTENTICADO` e o usuário é mandado de volta ao login, mesmo tendo em mãos um refresh token válido por 7 dias. O backend já devolve esse refresh token no login, mas o frontend apenas o persiste e nunca o utiliza, encerrando sessões antes do necessário e fazendo o usuário perder o trabalho em andamento.

## What Changes

- Persistir `accessToken` e `refreshToken` recebidos no login e mantê-los sincronizados entre a sessão em memória e o armazenamento local.
- Adicionar um interceptor de resposta no cliente HTTP compartilhado: em `401` de uma rota protegida, solicitar um novo par de tokens via `POST /auth/refresh` e repetir a requisição original **uma única vez**.
- Agrupar `401`s simultâneos em uma única renovação (single-flight), evitando múltiplas rotações concorrentes.
- Persistir a rotação: o backend revoga o refresh token usado e devolve um novo; o frontend deve gravar o par novo e nunca reutilizar o antigo.
- Definir a política de falha: `401` no refresh (ou ausência de refresh token) encerra a sessão e leva ao login; erro de rede/5xx mantém a sessão para nova tentativa.
- Reaproveitar a renovação feita por outra aba: reler a sessão armazenada antes e depois do refresh, usando o token novo quando ele já existir.
- Nunca tentar renovar requisições de `/auth/*` (login, refresh, logout, recuperação e redefinição de senha).
- Alinhar o adaptador de demonstração ao contrato atual de login e adicionar `POST /auth/refresh`, para que o fluxo possa ser exercitado no modo demo.
- Exibir uma mensagem de "sessão expirada" na tela de login quando a renovação falhar de forma definitiva.

## Capabilities

### New Capabilities

- `autenticacao`: ciclo de vida da sessão no cliente web, cobrindo persistência do login, renovação do access token em `401`, rotação do refresh token, logout e tratamento de sessão expirada.

### Modified Capabilities

Nenhuma. As demais capacidades (`caixa`, `doacoes`, `estoque`, `evento-cardapio`, `eventos`, `vendas`) não têm requisitos alterados; apenas passam a se beneficiar da renovação transparente no cliente HTTP.

## Impact

- `src/shared/api/cliente.ts`: registro do renovador de token, interceptor de resposta, single-flight e repetição única.
- `src/features/auth/services/autenticacao.ts`: chamada `POST /auth/refresh`.
- `src/features/auth/providers/AuthProvider.tsx`: renovação, persistência da rotação, encerramento de sessão e registro do renovador.
- `src/features/auth/models/auth.ts`: tipo do par de tokens renovado.
- `src/shared/api/demo/adaptador.ts`: contrato de login atualizado e rota de refresh.
- `src/app/routes/RotaProtegida.tsx` e `src/features/auth/pages/LoginPage.tsx`: apenas se a mensagem de sessão expirada for mantida no escopo.
- `docs/arquitetura.md`: registro da decisão do renovador registrável.
- Ajustes pontuais, sem mudança de comportamento, para destravar o gate: remoção de `control` não usado em `QuitarFiadoModal`, remoção do export inexistente de `ItemVenda` e consumo de `eventos/utils/datas` pelo barril público de `eventos`.
- Sem mudanças no backend: `/auth/refresh` e `/auth/logout` já existem. Sem novas dependências.

Premissas registradas:

- A sessão continua no `localStorage`, mantendo o comportamento atual de persistir entre recarregamentos.
- A renovação é reativa ao `401`, não proativa por `exp` do JWT. A renovação proativa fica fora deste change.
- O alinhamento do modo demo entra no escopo por ser pré-requisito para validar o fluxo no `npm run dev`.
- A concorrência entre abas usa releitura do armazenamento, sem lock distribuído.