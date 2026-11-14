# autenticacao Specification

## Purpose

Define o ciclo de vida da sessão no cliente web: login, envio do access token, renovação transparente em 401 com rotação do refresh token, logout e tratamento de sessão expirada.

## Requirements

### Requirement: Persistência da sessão no login

Ao concluir o login, o cliente SHALL manter o access token, o refresh token e os dados do usuário na sessão ativa e SHALL restaurá-los após recarregar a aplicação. Requisições a rotas protegidas SHALL enviar o access token no cabeçalho `Authorization` como `Bearer`.

#### Scenario: Login bem-sucedido

- **WHEN** o usuário informa credenciais válidas e a API responde com `accessToken`, `refreshToken` e `usuario`
- **THEN** o cliente mantém a sessão ativa com os três dados
- **AND** as requisições seguintes enviam `Authorization: Bearer <accessToken>`

#### Scenario: Restauração após recarregar

- **WHEN** a aplicação é recarregada com uma sessão previamente persistida
- **THEN** o cliente restaura os tokens e os dados do usuário
- **AND** as requisições seguintes enviam o access token restaurado

### Requirement: Renovação automática em 401

Quando uma requisição a rota protegida receber `401` por access token inválido ou expirado, o cliente SHALL solicitar um novo par de tokens usando o refresh token armazenado e SHALL repetir a requisição original uma única vez com o novo access token, sem expor o `401` ao chamador quando a renovação tiver sucesso.

#### Scenario: Access token expirado

- **WHEN** uma requisição protegida responde `401` e existe refresh token válido
- **THEN** o cliente chama `POST /auth/refresh` com o refresh token armazenado
- **AND** repete a requisição original com o novo access token
- **AND** o chamador recebe a resposta de sucesso da requisição repetida

#### Scenario: Requisição repetida também recebe 401

- **WHEN** a requisição repetida com o novo access token responde `401` novamente
- **THEN** o cliente não dispara uma segunda renovação
- **AND** encerra a sessão, pois o novo token não foi aceito

### Requirement: Renovação única para 401s simultâneos

Renovações disparadas por `401`s simultâneos SHALL compartilhar uma única chamada de refresh. Apenas uma rotação de refresh token SHALL ocorrer por rajada, e todas as requisições pendentes SHALL ser repetidas com o mesmo novo access token.

#### Scenario: Várias requisições falham ao mesmo tempo

- **WHEN** três requisições protegidas recebem `401` antes de a renovação terminar
- **THEN** o cliente envia apenas um `POST /auth/refresh`
- **AND** as três requisições são repetidas com o access token resultante

### Requirement: Rotação do refresh token

Cada renovação bem-sucedida SHALL substituir, na sessão ativa e no armazenamento persistido, tanto o access token quanto o refresh token pelo par devolvido pelo servidor. O refresh token anterior MUST NOT ser reutilizado.

#### Scenario: Persistência do novo par

- **WHEN** o refresh responde com um novo `accessToken` e um novo `refreshToken`
- **THEN** o cliente grava o par novo na sessão em memória e no armazenamento persistido
- **AND** a próxima renovação utiliza o refresh token novo

#### Scenario: Logout após renovação

- **WHEN** o usuário encerra a sessão depois de uma renovação bem-sucedida
- **THEN** o cliente envia ao logout o refresh token mais recente, não o anterior

### Requirement: Encerramento em falha definitiva da renovação

Quando a renovação falhar de forma definitiva — refresh token ausente, inválido, revogado ou expirado (`401`) — o cliente SHALL encerrar a sessão, remover as credenciais persistidas, descartar o token em memória e encaminhar o usuário ao login com indicação de sessão expirada.

#### Scenario: Refresh token inválido ou expirado

- **WHEN** o `POST /auth/refresh` responde `401`
- **THEN** o cliente limpa a sessão em memória e no armazenamento
- **AND** redireciona o usuário para a tela de login
- **AND** a tela de login informa que a sessão expirou

#### Scenario: Sessão sem refresh token

- **WHEN** uma requisição protegida recebe `401` e a sessão não possui refresh token
- **THEN** o cliente encerra a sessão e redireciona para o login
- **AND** não tenta chamar `/auth/refresh`

### Requirement: Preservação da sessão em falha transitória

Quando a renovação falhar por erro transitório (falha de rede, timeout ou resposta `5xx`), o cliente SHALL preservar a sessão e as credenciais e SHALL propagar o erro ao chamador, permitindo nova tentativa sem exigir novo login.

#### Scenario: API indisponível durante a renovação

- **WHEN** o `POST /auth/refresh` falha por timeout ou erro de rede
- **THEN** o cliente mantém a sessão e o refresh token armazenados
- **AND** propaga o erro para a tela que fez a requisição
- **AND** o usuário pode tentar novamente sem refazer o login

### Requirement: Rotas de autenticação não disparam renovação

O cliente MUST NOT tentar renovar tokens para requisições às rotas de autenticação (`/auth/login`, `/auth/refresh`, `/auth/logout`, recuperação e redefinição de senha), mesmo que elas respondam `401`.

#### Scenario: Credenciais inválidas no login

- **WHEN** `POST /auth/login` responde `401` por credenciais inválidas
- **THEN** o cliente exibe o erro de credenciais
- **AND** não chama `/auth/refresh`

#### Scenario: Falha no próprio refresh

- **WHEN** `POST /auth/refresh` responde `401`
- **THEN** o cliente não tenta renovar novamente a partir dessa resposta
- **AND** aplica a política de falha definitiva

### Requirement: Reaproveitamento de renovação entre abas

Quando outra aba já tiver renovado a sessão, o cliente SHALL reutilizar o access token persistido em vez de iniciar outra renovação. Após uma falha de refresh, o cliente SHALL reler a sessão e adotar um token mais recente, se existir, antes de encerrar a sessão.

#### Scenario: Outra aba renovou antes do 401

- **WHEN** uma requisição falha com um access token antigo, mas o armazenamento já contém um access token diferente
- **THEN** o cliente usa o token mais recente
- **AND** não envia um novo `POST /auth/refresh`

#### Scenario: Outra aba vence a corrida do refresh

- **WHEN** duas abas renovam com o mesmo refresh token e esta aba recebe `401`
- **THEN** o cliente relê a sessão
- **AND** se houver um access token mais novo, adota esse token e repete a requisição
- **AND** somente encerra a sessão se nenhum token mais novo existir

### Requirement: Sessão não é restaurada após encerramento

Se a sessão for encerrada (logout ou ação de outra aba) enquanto uma renovação estiver em andamento, o cliente MUST NOT restaurar a sessão quando a resposta do refresh chegar.

#### Scenario: Logout durante renovação

- **WHEN** o usuário faz logout enquanto um `POST /auth/refresh` está em andamento
- **THEN** o cliente descarta o resultado da renovação
- **AND** permanece deslogado

### Requirement: Logout revoga o refresh token e limpa a sessão local

O logout SHALL enviar o refresh token atual para `POST /auth/logout` e SHALL remover a sessão local independentemente do resultado da chamada. Após o logout, rotas protegidas SHALL redirecionar para o login.

#### Scenario: Logout com API disponível

- **WHEN** o usuário aciona o logout
- **THEN** o cliente envia `{ refreshToken }` para `POST /auth/logout`
- **AND** remove a sessão em memória e do armazenamento
- **AND** rotas protegidas passam a redirecionar para o login

#### Scenario: Logout com API indisponível

- **WHEN** o usuário aciona o logout e a chamada ao backend falha
- **THEN** o cliente ainda remove a sessão local
- **AND** o usuário permanece deslogado

### Requirement: Modo de demonstração alinhado ao contrato de autenticação

No modo de demonstração, o adaptador SHALL responder ao login com o mesmo formato do backend (`accessToken`, `refreshToken`, `usuario`) e SHALL disponibilizar `POST /auth/refresh` com rotação de tokens, permitindo exercitar o fluxo sem a API real.

#### Scenario: Login no modo demo

- **WHEN** o usuário entra com um e-mail válido no modo de demonstração
- **THEN** a sessão contém `accessToken`, `refreshToken` e `usuario`
- **AND** o usuário permanece autenticado nas rotas protegidas

#### Scenario: Renovação no modo demo

- **WHEN** uma requisição no modo demo recebe `401` e existe refresh token
- **THEN** o adaptador responde ao refresh com um novo par de tokens
- **AND** a requisição original é repetida com sucesso
