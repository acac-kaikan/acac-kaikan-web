# Design

## Context

Hoje o `AuthProvider` já lê a sessão do `localStorage`, guarda `accessToken`, `refreshToken` e `usuario`, e sincroniza o token em memória via `definirToken` em `src/shared/api/cliente.ts`. O cliente HTTP só tem interceptor de requisição; não existe reação a `401`. O backend já implementa `POST /auth/refresh` com rotação (o token usado é revogado), access token de 15 minutos e refresh token de 7 dias.

Duas restrições moldam a solução:

- `src/shared` não pode importar `src/features` (regra do `dependency-cruiser`), então o cliente HTTP não pode importar o `AuthProvider` nem conhecer a chave de sessão.
- O backend aceita apenas uma renovação por refresh token. Duas abas renovando ao mesmo tempo com o mesmo token resultam em uma falha `401` para a perdedora.

O adaptador de demonstração também está fora do contrato atual: devolve `{ token, user }` no login e não possui `/auth/refresh`, o que impede validar o fluxo no modo demo.

## Goals / Non-Goals

**Goals:**

- Renovar o access token de forma transparente quando uma rota protegida responder `401`.
- Agrupar `401`s simultâneos em uma única renovação por aba.
- Persistir a rotação do refresh token e nunca reutilizar o token anterior.
- Separar falha definitiva (encerra a sessão) de falha transitória (preserva a sessão).
- Reaproveitar a renovação feita por outra aba quando possível.
- Alinhar o modo demo ao contrato real para permitir validação sem a API.
- Manter as fronteiras de dependência existentes.

**Non-Goals:**

- Renovação proativa baseada no `exp` do JWT. A reação ao `401` continua sendo o mecanismo principal.
- Migrar a sessão para cookie `httpOnly`. Isso exigiria mudança no backend e fica para uma iniciativa futura.
- Alterar o backend. `/auth/refresh` e `/auth/logout` já existem e atendem ao fluxo.
- Implementar lock distribuído entre abas com `BroadcastChannel` ou `localStorage` nesta mudança. A mitigação por releitura do armazenamento cobre o caso comum.
- Atualizar permissões/cargo do usuário a cada renovação. O `/auth/refresh` devolve apenas tokens; os dados do usuário permanecem os do login.

## Decisions

### 1. Renovador registrável no cliente compartilhado

O `cliente.ts` passa a expor `definirRenovadorDeToken(fn)`. O `AuthProvider` registra uma função que sabe ler a sessão, chamar `/auth/refresh` e persistir a rotação. O interceptor do cliente apenas decide **quando** renovar e **como** repetir; a política de sessão fica em `features/auth`.

Alternativas consideradas:

- **Instalar o interceptor dentro do `AuthProvider`**: concentraria tudo em `auth`, mas colocaria responsabilidade de HTTP na feature e criaria dependência do ciclo de vida do provider.
- **Mover a sessão para `shared/api`**: o cliente renovaria sozinho, porém mudaria a decisão de arquitetura atual e aumentaria o escopo sem ganho claro.

O callback preserva a regra já documentada em `docs/arquitetura.md`: o cliente não conhece a chave de storage nem importa `features/auth`.

### 2. Renovação única por rajada (single-flight)

O interceptor mantém uma `Promise` de renovação em andamento. Se outra requisição receber `401` enquanto a renovação está em curso, ela aguarda a mesma `Promise` em vez de chamar `/auth/refresh` de novo. A `Promise` é limpa no `finally`, inclusive em caso de erro.

Isso evita rotações concorrentes dentro da mesma aba e reduz a chance de `401` em cascata.

### 3. O renovador recebe o token que falhou

A assinatura é `renovar(tokenUsado: string | null): Promise<string>`. O interceptor extrai o `Bearer` da requisição que recebeu `401` e o repassa ao renovador. Isso permite dois atalhos:

- Se a sessão armazenada já tem um `accessToken` diferente do `tokenUsado`, outra aba (ou uma requisição anterior) já renovou; basta usar o token novo.
- Se a requisição recebeu `401` atrasado, depois de uma renovação já concluída, não é necessário renovar de novo.

Sem esse parâmetro, o cliente poderia disparar uma segunda rotação desnecessária e invalidar o refresh token recém-emitido.

### 4. Política de falha

| Situação | Comportamento |
| --- | --- |
| `401` em rota protegida | Renova e repete a requisição uma vez |
| `401` na requisição repetida | Não renova de novo; encerra a sessão |
| `401` no refresh | Relê a sessão; adota token mais novo se outra aba venceu; senão encerra a sessão |
| Erro de rede, timeout ou `5xx` no refresh | Preserva a sessão e propaga o erro |
| Ausência de refresh token | Encerra a sessão sem chamar o backend |
| `401` em `/auth/*` | Não renova; devolve o erro original |

A distinção entre falha definitiva e transitória evita deslogar o usuário por uma indisponibilidade momentânea da API.

### 5. Rotas de autenticação são ignoradas

O interceptor não trata `401` de nenhuma URL que comece com `/auth/`. Isso cobre login (credenciais inválidas), refresh (evita recursão), logout e recuperação/redefinição de senha. A verificação deve considerar `config.url` relativo e absoluto, removendo a origem quando necessário.

### 6. Verificação da sessão antes de persistir a rotação

Depois que `/auth/refresh` responde, o renovador relê a sessão armazenada e confere se o `refreshToken` ainda é o mesmo que foi enviado. Se a sessão sumiu (logout) ou mudou (outra aba), o resultado é descartado em vez de ressuscitar uma sessão encerrada. Essa verificação também cobre o caso de logout durante uma renovação em voo.

Para testar os ramos dessa política sem depender de React, a implementação extrai a regra para uma função de serviço com dependências injetadas (`lerSessao`, `salvarSessao`, `renovarTokens`, `definirToken` e `encerrarSessao`). O `AuthProvider` apenas liga essa função ao estado e ao armazenamento reais. Assim, os cenários de rotação, falha definitiva, falha transitória e logout durante o refresh ficam cobertos por testes unitários.

### 7. Fábrica de cliente para testabilidade

O `cliente.ts` atual é um singleton com estado de módulo (`tokenAtual`). Para testar o interceptor sem vazar estado entre testes, a implementação extrai uma fábrica `criarCliente()` que encapsula `tokenAtual`, o renovador e a `Promise` de renovação. O módulo continua exportando o singleton `api`, `definirToken` e `definirRenovadorDeToken`, preservando os imports existentes.

A fábrica permite:

- Injetar um adapter falso nos testes.
- Criar instâncias isoladas com `definirToken`/`definirRenovadorDeToken` próprios.
- Testar single-flight, retry único, exclusão de `/auth/*` e adoção de token de outra aba.

Alternativa considerada: manter o singleton e sobrescrever `api.defaults.adapter` nos testes. É mais simples, mas o estado global entre testes fica frágil.

### 8. Persistência da sessão

A sessão continua no `localStorage`, mantendo o comportamento de sobreviver a recarregamentos e à conta compartilhada. O `AuthProvider` permanece como dono da chave e da política de encerramento; o cliente só recebe o access token em memória.

O refresh token no `localStorage` é um risco aceito: qualquer XSS pode exfiltrá-lo. A mitigação definitiva seria cookie `httpOnly`, que está fora do escopo porque o backend recebe o refresh token no corpo.

### 9. Mensagem de sessão expirada

O `AuthProvider` expõe no contexto um indicador de motivo de encerramento (por exemplo, `sessaoExpirada: boolean`). O `RotaProtegida`, ao redirecionar para `/login`, inclui esse indicador no `state` da navegação. O `LoginPage` lê o `state` e mostra a mensagem "Sua sessão expirou. Entre novamente.".

O login bem-sucedido e o logout manual limpam o indicador, para que a mensagem não apareça em um logout normal nem persista depois de um novo login.

Alternativa considerada: mostrar um toast antes de limpar a sessão. O toast seria perdido ou exigiria um canal fora do `ToastProvider`, que é filho do `AuthProvider`. O `state` do router é mais simples e sobrevive ao redirecionamento.

### 10. Adaptador de demonstração

O `demo/adaptador.ts` passa a responder o login no formato `{ accessToken, refreshToken, usuario }`, com `usuario` contendo `nome`, `cargo` e `permissoes` (o perfil `ADMINISTRADOR` pode devolver a lista completa de permissões). Também ganha `POST /auth/refresh`.

Para sobreviver a recarregamentos sem servidor, os tokens demo são opacos e autossuficientes:

- `accessToken`: contém o e-mail e o instante de expiração (por exemplo, `demo-access-<base64>-<epochMs>`).
- `refreshToken`: contém o e-mail (por exemplo, `demo-refresh-<base64>`).

O adaptador valida o access token em todas as rotas que não começam com `/auth/` e responde `401` quando ele está ausente, malformado ou expirado. Isso reproduz o comportamento real e permite exercitar a renovação no modo demo. O TTL do access token demo é curto (por exemplo, 2 minutos) justamente para que o fluxo aconteça durante uma sessão de teste; a renovação é transparente. O refresh valida o prefixo, decodifica o e-mail e emite um novo par. A rotação não é revogada de verdade no modo demo; isso é aceitável porque o modo demo não tem estado de servidor.

### 11. Tipagem do marcador de retry

A config do Axios recebe um marcador interno (`_tentativaRenovacao`) para impedir loop. A implementação usa um tipo local (`InternalAxiosRequestConfig & { _tentativaRenovacao?: boolean }`) em vez de augmentar o módulo `axios`, mantendo o tipo privado ao cliente.

## Risks / Trade-offs

- **Corrida entre abas no refresh** -> A releitura do armazenamento antes e depois do refresh resolve o caso comum. Se as duas abas falharem antes de qualquer escrita, uma pode ser deslogada; um lock via `BroadcastChannel` fica como melhoria futura.
- **Resposta do refresh perdida** -> O servidor pode rotacionar e o cliente não receber a resposta. A próxima tentativa usa o refresh antigo, recebe `401` e exige novo login. É inerente ao modelo de rotação; a sessão é encerrada de forma limpa.
- **Loop de renovação** -> O marcador de retry impede uma segunda tentativa; um `401` na requisição repetida encerra a sessão.
- **Storm de requisições após falha definitiva** -> A sessão é limpa no primeiro `401` definitivo; requisições seguintes falham rápido por ausência de refresh token.
- **Logout durante renovação** -> A verificação do `refreshToken` antes de persistir impede que a sessão seja ressuscitada.
- **React Query com `retry: 1`** -> Uma query pode ser repetida após a falha, mas o single-flight e a sessão limpa evitam novas rotações.
- **XSS e refresh token de 7 dias no `localStorage`** -> Risco aceito no desenho atual; cookie `httpOnly` fica como evolução futura.
- **Modo demo não revoga refresh tokens** -> A rotação é apenas simulada; o comportamento real é validado em homologação com o backend.
- **Cache do React Query após logout** -> Dados da sessão anterior podem permanecer no cache. Não é um requisito desta mudança, mas deve ser considerado se os dados forem sensíveis.

## Migration Plan

- Não há migração de dados nem mudança de schema. O backend já suporta o fluxo.
- O deploy é apenas do frontend. Sessões existentes continuam válidas: o access token atual é usado até expirar; o refresh token já armazenado passa a ser utilizado no primeiro `401`.
- Rollback: reverter o frontend. Não há estado persistido incompatível; a sessão continua no formato atual (`accessToken`, `refreshToken`, `usuario`).
- Não é necessário feature flag. Em caso de falha generalizada do refresh, o pior cenário é o usuário precisar logar novamente.

## Open Questions

- Vale adicionar um lock entre abas com `BroadcastChannel` se o uso concorrente real se mostrar frequente? A mitigação atual é suficiente para o cenário de uma aba.
- Devemos limpar o cache do React Query no logout/expiração? É uma melhoria de privacidade, mas não é exigida por esta mudança.