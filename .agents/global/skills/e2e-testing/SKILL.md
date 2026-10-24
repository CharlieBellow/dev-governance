---
name: e2e-testing
description: Padrões de testes E2E com Playwright, Page Object Model, configuração, integração com CI/CD, gerenciamento de artefatos e estratégias para testes instáveis (flaky). Use ao escrever testes Playwright, estruturar page objects ou corrigir execuções E2E instáveis no CI.
metadata:
  origin: ECC
---

# Padrões de Testes E2E

Padrões completos de Playwright para construir suítes E2E estáveis, rápidas e fáceis de manter.

## Organização dos Arquivos de Teste

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── logout.spec.ts
│   │   └── register.spec.ts
│   ├── features/
│   │   ├── browse.spec.ts
│   │   ├── search.spec.ts
│   │   └── create.spec.ts
│   └── api/
│       └── endpoints.spec.ts
├── fixtures/
│   ├── auth.ts
│   └── data.ts
└── playwright.config.ts
```

## Page Object Model (POM)

```typescript
import { Page, Locator } from '@playwright/test'

export class ItemsPage {
  readonly page: Page
  readonly searchInput: Locator
  readonly itemCards: Locator
  readonly createButton: Locator

  constructor(page: Page) {
    this.page = page
    this.searchInput = page.locator('[data-testid="search-input"]')
    this.itemCards = page.locator('[data-testid="item-card"]')
    this.createButton = page.locator('[data-testid="create-btn"]')
  }

  async goto() {
    await this.page.goto('/items')
    await this.page.waitForLoadState('networkidle')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForResponse(resp => resp.url().includes('/api/search'))
    await this.page.waitForLoadState('networkidle')
  }

  async getItemCount() {
    return await this.itemCards.count()
  }
}
```

## Estrutura do Teste

```typescript
import { test, expect } from '@playwright/test'
import { ItemsPage } from '../../pages/ItemsPage'

test.describe('Busca de itens', () => {
  let itemsPage: ItemsPage

  test.beforeEach(async ({ page }) => {
    itemsPage = new ItemsPage(page)
    await itemsPage.goto()
  })

  test('deve buscar por palavra-chave', async ({ page }) => {
    await itemsPage.search('test')

    const count = await itemsPage.getItemCount()
    expect(count).toBeGreaterThan(0)

    await expect(itemsPage.itemCards.first()).toContainText(/test/i)
    await page.screenshot({ path: 'artifacts/search-results.png' })
  })

  test('deve tratar busca sem resultados', async ({ page }) => {
    await itemsPage.search('xyznonexistent123')

    await expect(page.locator('[data-testid="no-results"]')).toBeVisible()
    expect(await itemsPage.getItemCount()).toBe(0)
  })
})
```

## Configuração do Playwright

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    ['json', { outputFile: 'playwright-results.json' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

## Padrões para Testes Instáveis (Flaky)

### Quarentena

```typescript
test('instável: busca complexa', async ({ page }) => {
  test.fixme(true, 'Instável - Issue #123')
  // código do teste...
})

test('skip condicional', async ({ page }) => {
  test.skip(process.env.CI, 'Instável no CI - Issue #123')
  // código do teste...
})
```

### Identificar Instabilidade

```bash
npx playwright test tests/search.spec.ts --repeat-each=10
npx playwright test tests/search.spec.ts --retries=3
```

### Causas Comuns e Correções

**Condições de corrida:**
```typescript
// Ruim: assume que o elemento está pronto
await page.click('[data-testid="button"]')

// Bom: locator com espera automática
await page.locator('[data-testid="button"]').click()
```

**Tempo de rede:**
```typescript
// Ruim: timeout arbitrário
await page.waitForTimeout(5000)

// Bom: esperar uma condição específica
await page.waitForResponse(resp => resp.url().includes('/api/data'))
```

**Tempo de animação:**
```typescript
// Ruim: clicar durante a animação
await page.click('[data-testid="menu-item"]')

// Bom: esperar estabilizar
await page.locator('[data-testid="menu-item"]').waitFor({ state: 'visible' })
await page.waitForLoadState('networkidle')
await page.locator('[data-testid="menu-item"]').click()
```

## Gerenciamento de Artefatos

### Screenshots

```typescript
await page.screenshot({ path: 'artifacts/after-login.png' })
await page.screenshot({ path: 'artifacts/full-page.png', fullPage: true })
await page.locator('[data-testid="chart"]').screenshot({ path: 'artifacts/chart.png' })
```

### Traces

```typescript
await browser.startTracing(page, {
  path: 'artifacts/trace.json',
  screenshots: true,
  snapshots: true,
})
// ... ações do teste ...
await browser.stopTracing()
```

### Vídeo

```typescript
// Em playwright.config.ts
use: {
  video: 'retain-on-failure',
  videosPath: 'artifacts/videos/'
}
```

## Integração com CI/CD

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          BASE_URL: ${{ vars.STAGING_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Template de Relatório de Testes

```markdown
# Relatório de Testes E2E

**Data:** AAAA-MM-DD HH:MM
**Duração:** Xm Ys
**Status:** PASSANDO / FALHANDO

## Resumo
- Total: X | Passaram: Y (Z%) | Falharam: A | Instáveis: B | Pulados: C

## Testes com Falha

### nome-do-teste
**Arquivo:** `tests/e2e/feature.spec.ts:45`
**Erro:** Esperava que o elemento estivesse visível
**Screenshot:** artifacts/failed.png
**Correção Recomendada:** [descrição]

## Artefatos
- Relatório HTML: playwright-report/index.html
- Screenshots: artifacts/*.png
- Vídeos: artifacts/videos/*.webm
- Traces: artifacts/*.zip
```

## Testes de Carteira / Web3

```typescript
test('conexão da carteira', async ({ page, context }) => {
  // Mock do provider da carteira
  await context.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts')
          return ['0x1234567890123456789012345678901234567890']
        if (method === 'eth_chainId') return '0x1'
      }
    }
  })

  await page.goto('/')
  await page.locator('[data-testid="connect-wallet"]').click()
  await expect(page.locator('[data-testid="wallet-address"]')).toContainText('0x1234')
})
```

## Testes de Fluxos Financeiros / Críticos

```typescript
test('execução de trade', async ({ page }) => {
  // Pular em produção — dinheiro real
  test.skip(process.env.NODE_ENV === 'production', 'Pular em produção')

  await page.goto('/markets/test-market')
  await page.locator('[data-testid="position-yes"]').click()
  await page.locator('[data-testid="trade-amount"]').fill('1.0')

  // Verificar a pré-visualização
  const preview = page.locator('[data-testid="trade-preview"]')
  await expect(preview).toContainText('1.0')

  // Confirmar e esperar a blockchain
  await page.locator('[data-testid="confirm-trade"]').click()
  await page.waitForResponse(
    resp => resp.url().includes('/api/trade') && resp.status() === 200,
    { timeout: 30000 }
  )

  await expect(page.locator('[data-testid="trade-success"]')).toBeVisible()
})
```
