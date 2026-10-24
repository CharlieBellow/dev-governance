---
name: docker-patterns
description: Padrões de Docker e Docker Compose para desenvolvimento local, harnesses endurecidos de instaladores de CLI, segurança de containers, rede, volumes e orquestração de vários serviços. Use ao criar ou revisar Dockerfiles e serviços do Compose, testar instaladores em várias distribuições Linux ou planejar uma validação nativa correta em macOS e Windows.
---

# Padrões Docker

Boas práticas de Docker e Docker Compose para desenvolvimento em containers.

## Docker Compose para Desenvolvimento Local

### Stack Padrão de Aplicação Web

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: dev                     # Usa o estágio dev do Dockerfile multi-stage
    ports:
      - "3000:3000"
    volumes:
      - .:/app                        # Bind mount para hot reload
      - /app/node_modules             # Volume anônimo -- preserva as dependências do container
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379/0
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  mailpit:                            # Teste de e-mail local
    image: axllent/mailpit
    ports:
      - "8025:8025"                   # Interface web
      - "1025:1025"                   # SMTP

volumes:
  pgdata:
  redisdata:
```

### Dockerfile de Desenvolvimento vs Produção

```dockerfile
# Estágio: dependências
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Estágio: dev (hot reload, ferramentas de debug)
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Estágio: build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

# Estágio: produção (imagem mínima)
FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### Arquivos de Override

```yaml
# docker-compose.override.yml (carregado automaticamente, configurações só de dev)
services:
  app:
    environment:
      - DEBUG=app:*
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"                   # Debugger do Node.js

# docker-compose.prod.yml (explícito para produção)
services:
  app:
    build:
      target: production
    restart: always
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

```bash
# Desenvolvimento (carrega o override automaticamente)
docker compose up

# Produção
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Rede

### Descoberta de Serviços

Serviços na mesma rede do Compose são resolvidos pelo nome do serviço:
```
# A partir do container "app":
postgres://postgres:postgres@db:5432/app_dev    # "db" resolve para o container db
redis://redis:6379/0                             # "redis" resolve para o container redis
```

### Redes Customizadas

```yaml
services:
  frontend:
    networks:
      - frontend-net

  api:
    networks:
      - frontend-net
      - backend-net

  db:
    networks:
      - backend-net              # Acessível só pela api, não pelo frontend

networks:
  frontend-net:
  backend-net:
```

### Expondo Apenas o Necessário

```yaml
services:
  db:
    ports:
      - "127.0.0.1:5432:5432"   # Acessível só a partir do host, não pela rede
    # Omita as portas em produção -- acessível apenas dentro da rede do Docker
```

## Estratégias de Volume

```yaml
volumes:
  # Volume nomeado: persiste entre reinícios do container, gerenciado pelo Docker
  pgdata:

  # Bind mount: mapeia um diretório do host para o container (para desenvolvimento)
  # - ./src:/app/src

  # Volume anônimo: preserva conteúdo gerado no container contra a sobrescrita do bind mount
  # - /app/node_modules
```

### Padrões Comuns

```yaml
services:
  app:
    volumes:
      - .:/app                   # Código-fonte (bind mount para hot reload)
      - /app/node_modules        # Protege o node_modules do container contra o do host
      - /app/.next               # Protege o cache de build

  db:
    volumes:
      - pgdata:/var/lib/postgresql/data          # Dados persistentes
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql  # Scripts de inicialização
```

## Segurança de Containers

### Endurecimento do Dockerfile

```dockerfile
# 1. Use tags específicas (nunca :latest)
FROM node:22.12-alpine3.20

# 2. Rode como usuário não-root
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
USER app

# 3. Remova capabilities (no compose)
# 4. Sistema de arquivos raiz somente leitura quando possível
# 5. Nenhum segredo nas camadas da imagem
```

### Segurança no Compose

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /app/.cache
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE          # Só se fizer bind em portas < 1024
```

### Gerenciamento de Segredos

```yaml
# BOM: use variáveis de ambiente (injetadas em tempo de execução)
services:
  app:
    env_file:
      - .env                     # Nunca faça commit do .env no git
    environment:
      - API_KEY                  # Herda do ambiente do host

# BOM: Docker secrets (modo Swarm)
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  db:
    secrets:
      - db_password

# RUIM: fixo na imagem
# ENV API_KEY=sk-proj-xxxxx      # NUNCA FAÇA ISSO
```

## Harnesses Endurecidos de Instaladores de CLI

Use containers para testar o comportamento de instaladores em cópias descartáveis do projeto, sem permitir que o teste altere o checkout de origem.

### Respeite a Fronteira de Plataforma

- Rode containers reais para distribuições Linux como Debian e Ubuntu.
- O macOS não roda como container Docker, porque o Docker compartilha um kernel Linux. Rode o mesmo ponto de entrada de teste, sem shell, nativamente no macOS.
- Containers Windows exigem um engine Docker Windows. Rode a lógica independente de plataforma em um runner de CI Windows nativo e reserve containers Windows para um host Windows.
- Mantenha uma matriz de CI nativa Ubuntu/macOS/Windows para caminhos específicos do host, shims de comandos, quoting e comportamento do sistema de arquivos.

Não afirme que um container Linux valida o comportamento no macOS ou no Windows.

### Garanta o Contrato de Isolamento

- Fixe as imagens base por digest imutável e fixe as versões das CLIs instaladas.
- Rode com UID/GID numérico não-root quando os nomes de conta diferirem entre distros.
- Monte o repositório e o projeto de origem como somente leitura.
- Copie o projeto de origem para um workspace `tmpfs` gravável antes de qualquer alteração.
- Monte `/workspace` com `noexec`, UID/GID 1000 e `mode=0700`, para que só o
  usuário do container possa inspecionar os dados do projeto.
- Mantenha o cache executável do npm e do npx em `NPM_CONFIG_CACHE=/tmp/npm-cache`,
  no mount executável `/tmp`. O tamanho padrão é 2 GiB e pode ser ajustado
  com `ECC_TMPFS_SIZE`; `ECC_WORKSPACE_SIZE` controla separadamente o mount do
  workspace privado.
- Defina `read_only: true`, `no-new-privileges:true`, `cap_drop: [ALL]` e um `pids_limit` finito.
- Mantenha os serviços padrão de CLI real em `network_mode: none`. Adicione acesso
  à rede apenas por um serviço opt-in com nome visível, para uma sessão de provedor
  autenticada; nunca o torne um padrão acidental controlado por variável de ambiente.
- Crie apenas os caminhos temporários graváveis de que a ferramenta precisa.
- Não passe credenciais do host para o container por padrão.
- Use dry run por padrão e permita apenas os modos explícitos `dry-run`, `install`,
  `plugin` e `shell`.
- Use arrays de argumentos ou `spawnSync(..., { shell: false })` em runners multiplataforma. Nunca interpole caminhos do projeto em um comando de shell.

### Exercite o Harness de Setup do Plugin ECC

Use `docker/plugin-setup/compose.yaml` como implementação de referência. Ele fornece:

- `fixture-tests` para a suíte focada no manifesto de instalação, no alvo e no executor.
- `real-cli` para a imagem Linux genérica fixada, baseada em Debian.
- `real-cli-ubuntu` para a imagem Ubuntu fixada.

Valide o modelo do Compose antes do build:

```bash
docker compose -f docker/plugin-setup/compose.yaml config --quiet
```

Faça o build das duas imagens Linux reais:

```bash
docker compose -f docker/plugin-setup/compose.yaml \
  build real-cli real-cli-ubuntu
```

Rode o fluxo padrão seguro em cada imagem:

```bash
docker compose -p ecc-plugin-debian-test \
  -f docker/plugin-setup/compose.yaml \
  run --rm -T real-cli dry-run

docker compose -p ecc-plugin-ubuntu-test \
  -f docker/plugin-setup/compose.yaml \
  run --rm -T real-cli-ubuntu dry-run
```

O dry run executa o contrato público atual do comando:

```bash
ecc install --profile core --target claude-project --dry-run --json
```

Antes desse comando rodar, o container cria um artefato npm empacotado localmente
a partir do checkout somente leitura, com `npm pack --ignore-scripts`. Ele extrai o
tarball criado em `/tmp`, valida o nome do pacote `ecc-universal`, os manifestos
de instalação obrigatórios e o mapeamento confinado `bin.ecc` do `package.json`,
e então executa o binário `ecc` extraído. O runtime permanece em
`network_mode: none`, não executa scripts de ciclo de vida do pacote e não
depende do `node_modules` do host; as dependências de produção exatas e fixadas
já estão presentes na imagem.

O harness rejeita um plano vazio, um alvo diferente de `claude-project`, qualquer
operação fora de `/workspace/project/.claude` ou qualquer dry run que crie o
diretório alvo. O modo `install` aplica a instalação isolada duas vezes, verifica
o estado gerenciado da instalação, lista o alvo instalado e roda o `doctor`.

### Iniciar, Abrir, Reconectar e Limpar uma Sessão Nomeada

Inicie um container em background sem `--rm`, para que sair do terminal não remova
a sessão:

```bash
docker compose -p ecc-plugin-session \
  -f docker/plugin-setup/compose.yaml \
  run --detach --name ecc-plugin-shell real-cli shell
```

O container copia a fixture somente leitura para o diretório privado estável
`/workspace/project`. Confirme que ele está rodando e então emita o lado Docker
do contrato de dados v1 do terminal-opener:

```bash
docker inspect --format '{{.State.Running}}' ecc-plugin-shell
node docker/plugin-setup/interactive-plan.js \
  --container ecc-plugin-shell \
  --workdir /workspace/project \
  --json \
  -- bash
```

O resultado JSON tem exatamente a fronteira `executable` e `argv` (mais
`contractVersion: 1`): o executável é `docker`, e o argv começa com
`exec`, `-it` e `-w`. Passe esses dados para a skill separada terminal-opener
quando ela estiver instalada. Este harness Docker deliberadamente não importa um
adaptador de terminal, não interpola um comando de shell e não gerencia um processo
gráfico no host. Até lá, abra o mesmo PTY diretamente no terminal atual do host:

```bash
docker exec -it -w /workspace/project ecc-plugin-shell bash
```

Saia do shell sem parar o container em background. Reconecte com o
mesmo comando `docker exec -it`. Ao terminar, remova o container nomeado exato
e os recursos do projeto Compose:

```bash
docker rm --force ecc-plugin-shell
docker compose -p ecc-plugin-session \
  -f docker/plugin-setup/compose.yaml \
  down --remove-orphans
```

Credenciais do host ficam ausentes por padrão e diretórios de credenciais nunca são
montados. O serviço padrão também não tem acesso à rede. Quando uma sessão de
provedor autenticada realmente precisar de rede, faça o build do `real-cli` primeiro
e então opte de forma visível com `docker compose -f docker/plugin-setup/compose.yaml
--profile networked run --service-ports real-cli-networked shell`. A flag
`--service-ports` publica o mapeamento de callback em loopback do serviço.
Prefira autenticar dentro dessa sessão descartável. Se uma execução de CI precisar
herdar uma credencial do ambiente do host, faça isso como opt-in na chamada, com uma
flag `--env NAME` explícita do Compose, entenda que o valor fica inspecionável
e pode ser exfiltrado durante a vida do container, e remova o container nomeado
exato logo em seguida.

### Autenticar o Codex Dentro da Sessão com Rede

O `codex login` faz bind do servidor de callback OAuth em `127.0.0.1:1455` dentro do
container. Uma publicação de porta do Docker encaminha para a interface do container,
não para o loopback, então o redirecionamento do navegador do host para
`http://localhost:1455` é recusado sem uma ponte. O serviço `real-cli-networked`
publica `127.0.0.1:1455` do host na porta `1456` do container; faça a ponte dessa
porta para o loopback antes de fazer login:

```bash
(
  set -e
  npm install --global @openai/codex@0.162.0   # a imagem do harness não inclui o codex
  node /ecc/docker/plugin-setup/codex-auth-relay.js &
  relay_pid=$!
  trap 'kill "$relay_pid" 2>/dev/null || true; wait "$relay_pid" 2>/dev/null || true' EXIT
  codex login
)
```

O serviço com rede define `NPM_CONFIG_PREFIX=/tmp/ecc-npm` e adiciona o diretório
`bin` dele ao `PATH`. Isso mantém a instalação fixada gravável para o UID 1000
no mount executável `/tmp`, enquanto o sistema de arquivos raiz continua somente leitura.

Conclua o login no navegador do host. Cada tentativa gera um novo
`state`/`code`, então sempre siga o link impresso mais recente. O token fica no
`~/.codex/auth.json` do container descartável; remover o container nomeado
apaga essa cópia da credencial. O bloco de login encerra o relay em caso de sucesso ou falha.
Apenas um container pode ocupar a porta 1455 do host por vez,
porque o redirecionamento OAuth aponta para uma porta fixa.

A publicação no host é restrita ao loopback. Dentro do container, o relay
escuta em todas as interfaces para que o Docker possa encaminhar para ele; outros
containers na mesma rede bridge conseguem alcançá-lo enquanto ele roda. Use uma rede
dedicada, sem pares não confiáveis, para esse login e remova o container nomeado exato
após o uso. Conexões de callback ociosas são fechadas após 30 segundos.

Rode a mesma suíte focada nativamente no host:

```bash
npm run test:plugin-setup-platform
```

Inspecione a identidade e o ambiente gerados antes de confiar na imagem:

```bash
docker image inspect ecc-plugin-setup:debian ecc-plugin-setup:ubuntu
```

Limpe cada projeto de teste nomeado sem apagar volumes ou imagens não relacionados:

```bash
docker compose -p ecc-plugin-debian-test \
  -f docker/plugin-setup/compose.yaml down --remove-orphans
docker compose -p ecc-plugin-ubuntu-test \
  -f docker/plugin-setup/compose.yaml down --remove-orphans
```

## .dockerignore

```
node_modules
.git
.env
.env.*
dist
coverage
*.log
.next
.cache
docker-compose*.yml
Dockerfile*
README.md
tests/
```

## Depuração

### Comandos Comuns

```bash
# Ver logs
docker compose logs -f app           # Acompanhar os logs do app
docker compose logs --tail=50 db     # Últimas 50 linhas do db

# Executar comandos em um container em execução
docker compose exec app sh           # Shell no app
docker compose exec db psql -U postgres  # Conectar ao postgres

# Inspecionar
docker compose ps                     # Serviços em execução
docker compose top                    # Processos em cada container
docker stats                          # Uso de recursos

# Rebuild
docker compose up --build             # Refaz as imagens
docker compose build --no-cache app   # Força o rebuild completo

# Limpeza
docker compose down                   # Para e remove os containers
docker compose down -v                # Também remove os volumes (DESTRUTIVO)
docker system prune                   # Remove imagens/containers não usados
```

### Depurando Problemas de Rede

```bash
# Verificar a resolução de DNS dentro do container
docker compose exec app nslookup db

# Verificar conectividade
docker compose exec app wget -qO- http://api:3000/health

# Inspecionar a rede
docker network ls
docker network inspect <project>_default
```

## Antipadrões

```
# RUIM: usar docker compose em produção sem orquestração
# Use Kubernetes, ECS ou Docker Swarm para cargas multi-container em produção

# RUIM: guardar dados em containers sem volumes
# Containers são efêmeros -- sem volumes, todos os dados se perdem ao reiniciar

# RUIM: rodar como root
# Sempre crie e use um usuário não-root

# RUIM: usar a tag :latest
# Fixe versões específicas para builds reproduzíveis

# RUIM: um container gigante com todos os serviços
# Separe responsabilidades: um processo por container

# RUIM: colocar segredos no docker-compose.yml
# Use arquivos .env (no .gitignore) ou Docker secrets
```
