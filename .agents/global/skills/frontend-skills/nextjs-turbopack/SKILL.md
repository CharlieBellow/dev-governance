---
name: nextjs-turbopack
description: Orientações sobre Next.js 16+ e Turbopack — bundling incremental em Rust, cache em sistema de arquivos, startup de dev e HMR mais rápidos, trade-offs entre Turbopack e webpack e a troca do nome middleware.ts para proxy.ts. Use ao desenvolver ou depurar apps Next.js 16+, diagnosticar startup de dev ou hot reload lentos, escolher entre bundlers ou revisar a nomenclatura do arquivo de middleware/proxy.
metadata:
  origin: ECC
---

# Next.js e Turbopack

O Next.js 16+ usa o Turbopack por padrão no desenvolvimento local: um bundler incremental escrito em Rust que acelera bastante o startup do dev e as atualizações a quente.

## Quando Usar

- **Turbopack (padrão no dev)**: use no dia a dia. Cold start e HMR mais rápidos, principalmente em apps grandes.
- **Webpack (dev legado)**: use apenas se encontrar um bug do Turbopack ou depender de um plugin exclusivo do webpack no dev. Desative com `--webpack` (ou `--no-turbopack`, dependendo da versão do Next.js; consulte a documentação da sua versão).
- **Produção**: o comportamento do build de produção (`next build`) pode usar Turbopack ou webpack conforme a versão do Next.js; consulte a documentação oficial da sua versão.

Use ao: desenvolver ou depurar apps Next.js 16+, diagnosticar startup de dev ou HMR lentos, ou otimizar bundles de produção.

## Como Funciona

- **Turbopack**: bundler incremental para o dev do Next.js. Usa cache em sistema de arquivos, então reinicializações ficam muito mais rápidas (ex.: 5–14x em projetos grandes).
- **Padrão no dev**: a partir do Next.js 16, `next dev` roda com Turbopack, a menos que seja desativado.
- **Cache em sistema de arquivos**: reinicializações reaproveitam trabalho anterior; o cache normalmente fica em `.next`; não precisa de configuração extra para o uso básico.
- **Bundle Analyzer (Next.js 16.1+)**: Bundle Analyzer experimental para inspecionar a saída e encontrar dependências pesadas; ative via config ou flag experimental (veja a documentação do Next.js da sua versão).

## Exemplos

### Comandos

```bash
next dev
next build
next start
```

### Uso

Rode `next dev` para desenvolvimento local com Turbopack. Use o Bundle Analyzer (veja a documentação do Next.js) para otimizar o code-splitting e enxugar dependências grandes. Prefira App Router e server components sempre que possível.

## Nome do Arquivo de Middleware

O Next.js 16 introduziu `proxy.ts` como nome do arquivo de middleware, substituindo a convenção antiga `middleware.ts`:

- **Next.js 16+**: use `proxy.ts` na raiz do projeto
- **Antes do Next.js 16**: use `middleware.ts` na raiz do projeto

A troca de nome está ligada à **versão do Next.js**, não ao bundler em uso (Turbopack ou webpack). Sempre consulte a documentação oficial da versão que está revisando.

**Não aponte `proxy.ts` como arquivo de middleware com nome errado ou ausente em projetos Next.js 16.** O arquivo está correto e é intencional. Sugerir renomeá-lo para `middleware.ts` quebra a execução do middleware.

Referência: [Documentação do proxy no Next.js](https://nextjs.org/docs/app/getting-started/proxy)

## Boas Práticas

- Mantenha-se em um Next.js 16.x recente para ter Turbopack e cache estáveis.
- Se o dev estiver lento, confirme que está usando o Turbopack (padrão) e que o cache não está sendo apagado sem necessidade.
- Para problemas de tamanho de bundle em produção, use a ferramenta oficial de análise de bundle do Next.js da sua versão.
