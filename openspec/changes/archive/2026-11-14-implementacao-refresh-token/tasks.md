# Tasks

## 1. Contrato de autenticação no modo demo

- [x] 1.1 Atualizar `src/shared/api/demo/adaptador.ts` para o login devolver `{ accessToken, refreshToken, usuario }`, com `usuario` contendo `nome`, `cargo` e `permissoes`; verificar com `npm run typecheck` e, no `npm run dev`, confirmar que o login mantém o usuário autenticado nas rotas protegidas.
- [x] 1.2 Implementar os tokens demo autossuficientes com expiração: access token com `epochMs` embutido e refresh token com o e-mail codificado; validar o access token em todas as rotas fora de `/auth/` e responder `401` quando ausente, malformado ou expirado; verificar com teste unitário que um token vencido recebe `401` e que o refresh devolve um par novo.
- [x] 1.3 Adicionar `POST /auth/refresh` ao adaptador demo, validando o refresh token e emitindo um novo par com rotação simulada; verificar com teste unitário do adaptador e com uma chamada manual no modo demo.
- [x] 1.4 Adicionar `POST /auth/logout` ao adaptador demo respondendo `204`; verificar que o logout no modo demo limpa a sessão sem erro de rota inexistente.
- [x] 1.5 Criar testes do adaptador demo cobrindo login, refresh, token expirado e logout; verificar com `npm test` que os novos testes passam.

## 2. Serviço de renovação

- [x] 2.1 Adicionar `renovarTokens(refreshToken)` em `src/features/auth/services/autenticacao.ts` chamando `POST /auth/refresh` e devolvendo `{ accessToken, refreshToken }`; verificar com `npm run typecheck` e com teste unitário que o corpo enviado contém o refresh token e que a resposta é repassada.
- [x] 2.2 Adicionar o tipo `TokensRenovados` em `src/features/auth/models/auth.ts` (ou reutilizar `Pick<Sessao, "accessToken" | "refreshToken">`) e exportá-lo pelo barril da feature; verificar com `npm run typecheck`.

## 3. Cliente HTTP com renovação

- [x] 3.1 Refatorar `src/shared/api/cliente.ts` para uma fábrica `criarCliente()` que encapsula token atual, renovador e promise de renovação, mantendo os exports existentes (`api`, `definirToken`, `definirRenovadorDeToken`); verificar com `npm run typecheck`, `npm run lint:boundaries` e com os imports atuais das features compilando.
- [x] 3.2 Implementar o interceptor de resposta: em `401` de rota protegida, chamar o renovador, marcar `_tentativaRenovacao`, ignorar URLs `/auth/*` e repetir a requisição original uma única vez; verificar com testes unitários de rota de autenticação, retry único e segundo `401`.
- [x] 3.3 Implementar o single-flight por promise compartilhada e repassar ao renovador o `tokenUsado` extraído do `Authorization` da requisição que falhou; verificar com teste unitário de três `401`s simultâneos gerando uma única renovação.
- [x] 3.4 Criar `src/shared/api/cliente.test.ts` cobrindo: renovação única para `401`s simultâneos, repetição com o token novo, ausência de renovação em `/auth/login`, ausência de segunda renovação após `401` na requisição repetida e repasse correto do `tokenUsado`; verificar com `npm test`.
- [x] 3.5 Atualizar `docs/arquitetura.md` registrando que o cliente expõe um renovador registrável e que a política de sessão permanece em `features/auth`; verificar que o texto corresponde aos exports e ao fluxo implementados.

## 4. Política de renovação e ciclo de sessão

- [x] 4.1 Criar a função de serviço de renovação em `src/features/auth/services/renovacaoSessao.ts` com dependências injetadas (`lerSessao`, `salvarSessao`, `renovarTokens`, `definirToken`, `encerrarSessao`), implementando o atalho por `tokenUsado`, a releitura após a resposta e a política de falha definitiva versus transitória; verificar com `npm run typecheck`.
- [x] 4.2 Criar testes unitários da política de renovação cobrindo: sucesso persiste a rotação, `tokenUsado` diferente evita nova chamada, `401` no refresh encerra a sessão, erro de rede/5xx preserva a sessão, logout durante o refresh não restaura a sessão e outra aba vencendo a corrida é adotada; verificar com `npm test`.
- [x] 4.3 Ligar a política ao `AuthProvider`: registrar/desregistrar o renovador em `useEffect`, atualizar `definirToken` e `setSessao` nos caminhos de sucesso e encerrar a sessão nos caminhos definitivos; verificar com `npm run typecheck` e manualmente que login, recarregamento e requisições autenticadas continuam funcionando.
- [x] 4.4 Ajustar `sair` para enviar o refresh token mais recente, limpar a sessão local e não permitir que uma renovação em voo restaure a sessão; verificar manualmente que o logout chama `POST /auth/logout` e que as rotas protegidas redirecionam para o login.
- [x] 4.5 Expor no contexto de autenticação um indicador de sessão expirada, definido apenas em falha definitiva de renovação e limpo no login e no logout manual; verificar com `npm run typecheck`.
- [x] 4.6 Atualizar `RotaProtegida` para propagar o indicador no `state` do redirecionamento e `LoginPage` para exibir "Sua sessão expirou. Entre novamente."; verificar manualmente que a mensagem aparece após refresh inválido e não aparece em logout manual nem após novo login.

## 5. Integração e validação

- [x] 5.1 Rodar o gate completo `npm test && npm run typecheck && npm run lint && npm run lint:boundaries && npm run build` e corrigir qualquer regressão; incluir os ajustes preexistentes aprovados: remover `control` não usado, remover o export de `ItemVenda` inexistente e consumir `eventos/utils/datas` pelo barril público.
- [x] 5.2 Com `npm run dev:homol` e o backend real, fazer login, substituir o `accessToken` do `localStorage` por um valor inválido e navegar; verificar no Network que ocorre um único `POST /auth/refresh`, que a requisição original é repetida com sucesso e que o novo par foi persistido.
- [x] 5.3 Com o access token expirado, abrir uma tela que dispara várias consultas simultâneas; verificar no Network que existe apenas um `POST /auth/refresh` para a rajada e todas as consultas são concluídas.
- [x] 5.4 Invalidar o `refreshToken` no `localStorage` e disparar uma requisição protegida; verificar que a sessão é removida e que o usuário chega ao login com a mensagem de sessão expirada.
- [x] 5.5 Derrubar a API (ou simular `5xx`) durante a renovação; verificar que a sessão é preservada, que o erro é exibido e que a operação funciona após a API voltar, sem exigir novo login.
- [x] 5.6 No modo demo (`npm run dev`), fazer login, aguardar a expiração curta do access token demo e navegar; verificar que a renovação acontece transparentemente e que o logout não exibe a mensagem de sessão expirada.
- [x] 5.7 Revisar a spec `autenticacao` e confirmar que cada cenário tem cobertura em teste automatizado ou no roteiro manual acima; registrar qualquer lacuna antes de encerrar.

## Workflow follow-up

- Arquivar o change após a revisão e o gate completo passarem.
- Verificar o resultado arquivado e a atualização da spec principal de `autenticacao`.