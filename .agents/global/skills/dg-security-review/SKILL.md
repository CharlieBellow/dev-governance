---
name: dg-security-review
description: Use esta skill ao adicionar autenticação, tratar entrada do usuário, lidar com segredos, criar endpoints de API ou implementar pagamentos/funcionalidades sensíveis. Fornece um checklist completo e padrões de segurança.
metadata:
  origin: ECC
---

# Skill de Revisão de Segurança

Esta skill garante que todo o código siga as boas práticas de segurança e identifica possíveis vulnerabilidades.

## Quando Ativar

- Ao implementar autenticação ou autorização
- Ao tratar entrada do usuário ou upload de arquivos
- Ao criar novos endpoints de API
- Ao lidar com segredos ou credenciais
- Ao implementar funcionalidades de pagamento
- Ao armazenar ou transmitir dados sensíveis
- Ao integrar APIs de terceiros

## Checklist de Segurança

### 1. Gerenciamento de Segredos

#### FALHA: NUNCA Faça Isto
```typescript
const apiKey = "sk-proj-xxxxx"  // Segredo fixo no código
const dbPassword = "password123" // No código-fonte
```

#### OK: SEMPRE Faça Isto
```typescript
const apiKey = process.env.OPENAI_API_KEY
const dbUrl = process.env.DATABASE_URL

// Verifique se os segredos existem
if (!apiKey) {
  throw new Error('OPENAI_API_KEY não configurada')
}
```

#### Passos de Verificação
- [ ] Nenhuma chave de API, token ou senha fixa no código
- [ ] Todos os segredos em variáveis de ambiente
- [ ] `.env.local` no .gitignore
- [ ] Nenhum segredo no histórico do git
- [ ] Segredos de produção na plataforma de hospedagem (Vercel, Railway)

### 2. Validação de Entrada

#### Sempre Valide a Entrada do Usuário
```typescript
import { z } from 'zod'

// Defina o schema de validação
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

// Valide antes de processar
export async function createUser(input: unknown) {
  try {
    const validated = CreateUserSchema.parse(input)
    return await db.users.create(validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues }
    }
    throw error
  }
}
```

#### Validação de Upload de Arquivos
```typescript
function validateFileUpload(file: File) {
  // Checagem de tamanho (máx. 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande (máx. 5MB)')
  }

  // Checagem de tipo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de arquivo inválido')
  }

  // Checagem de extensão
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error('Extensão de arquivo inválida')
  }

  return true
}
```

#### Passos de Verificação
- [ ] Todas as entradas do usuário validadas com schemas
- [ ] Uploads de arquivo restritos (tamanho, tipo, extensão)
- [ ] Nenhum uso direto da entrada do usuário em queries
- [ ] Validação por lista de permitidos (não por lista de bloqueados)
- [ ] Mensagens de erro não vazam informações sensíveis

### 3. Prevenção de SQL Injection

#### FALHA: NUNCA Concatene SQL
```typescript
// PERIGOSO - vulnerabilidade de SQL Injection
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
await db.query(query)
```

#### OK: SEMPRE Use Queries Parametrizadas
```typescript
// Seguro - query parametrizada
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)

// Ou com SQL puro -- o valor vai no array de parâmetros, nunca na
// string. Use a sintaxe de placeholder do seu driver (o Postgres numera
// os placeholders, o MySQL usa "?").
await db.query(
  'SELECT * FROM users WHERE email = ?',
  [userEmail]
)
```

<!-- Não escreva um placeholder literal de cifrão-N em nenhum lugar deste arquivo.
     Invocar esta skill com argumentos o substitui, e o exemplo acima
     passa a ser exibido como SQL concatenado -- exatamente o antipadrão contra
     o qual esta seção alerta. Use "?" e cite a forma do Postgres em texto. -->

#### Passos de Verificação
- [ ] Todas as queries ao banco são parametrizadas
- [ ] Nenhuma concatenação de strings em SQL
- [ ] ORM/query builder usado corretamente
- [ ] Queries do Supabase devidamente sanitizadas

### 4. Autenticação e Autorização

#### Tratamento de Tokens JWT
```typescript
// FALHA: ERRADO: localStorage (vulnerável a XSS)
localStorage.setItem('token', token)

// OK: CORRETO: cookies httpOnly
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

#### Checagens de Autorização
```typescript
export async function deleteUser(userId: string, requesterId: string) {
  // SEMPRE verifique a autorização primeiro
  const requester = await db.users.findUnique({
    where: { id: requesterId }
  })

  if (requester.role !== 'admin') {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 403 }
    )
  }

  // Prossiga com a exclusão
  await db.users.delete({ where: { id: userId } })
}
```

#### Row Level Security (Supabase)
```sql
-- Ative o RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ver os próprios dados
CREATE POLICY "Users view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Usuários só podem atualizar os próprios dados
CREATE POLICY "Users update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

#### Passos de Verificação
- [ ] Tokens armazenados em cookies httpOnly (não em localStorage)
- [ ] Checagens de autorização antes de operações sensíveis
- [ ] Row Level Security ativado no Supabase
- [ ] Controle de acesso baseado em papéis implementado
- [ ] Gerenciamento de sessão seguro

### 5. Prevenção de XSS

#### Sanitize o HTML
```typescript
import DOMPurify from 'isomorphic-dompurify'

// SEMPRE sanitize HTML fornecido pelo usuário
function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

#### Content Security Policy

Comece restritivo e só afrouxe com um plano documentado de remoção. Não use
`'unsafe-inline'` ou `'unsafe-eval'` por padrão; eles anulam boa parte da
proteção do CSP e devem ser tratados como dívida temporária de compatibilidade.

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      base-uri 'self';
      object-src 'none';
      frame-ancestors 'none';
      script-src 'self';
      style-src 'self';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://api.example.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
]
```

#### Passos de Verificação
- [ ] HTML fornecido pelo usuário sanitizado
- [ ] Headers de CSP configurados
- [ ] Nenhuma renderização de conteúdo dinâmico sem validação
- [ ] Proteção nativa contra XSS do React utilizada

### 6. Proteção contra CSRF

#### Tokens CSRF
```typescript
import { csrf } from '@/lib/csrf'

export async function POST(request: Request) {
  const token = request.headers.get('X-CSRF-Token')

  if (!csrf.verify(token)) {
    return NextResponse.json(
      { error: 'Token CSRF inválido' },
      { status: 403 }
    )
  }

  // Processa a requisição
}
```

#### Cookies SameSite
```typescript
res.setHeader('Set-Cookie',
  `session=${sessionId}; HttpOnly; Secure; SameSite=Strict`)
```

#### Passos de Verificação
- [ ] Tokens CSRF em operações que alteram estado
- [ ] SameSite=Strict em todos os cookies
- [ ] Padrão double-submit cookie implementado

### 7. Rate Limiting

#### Rate Limiting na API
```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por janela
  message: 'Muitas requisições'
})

// Aplique nas rotas
app.use('/api/', limiter)
```

#### Operações Caras
```typescript
// Rate limiting agressivo para buscas
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requisições por minuto
  message: 'Muitas requisições de busca'
})

app.use('/api/search', searchLimiter)
```

#### Passos de Verificação
- [ ] Rate limiting em todos os endpoints da API
- [ ] Limites mais rígidos em operações caras
- [ ] Rate limiting por IP
- [ ] Rate limiting por usuário (autenticado)

### 8. Exposição de Dados Sensíveis

#### Logs
```typescript
// FALHA: ERRADO: registrar dados sensíveis
console.log('User login:', { email, password })
console.log('Payment:', { cardNumber, cvv })

// OK: CORRETO: omitir dados sensíveis
console.log('User login:', { email, userId })
console.log('Payment:', { last4: card.last4, userId })
```

#### Mensagens de Erro
```typescript
// FALHA: ERRADO: expor detalhes internos
catch (error) {
  return NextResponse.json(
    { error: error.message, stack: error.stack },
    { status: 500 }
  )
}

// OK: CORRETO: mensagens de erro genéricas
catch (error) {
  console.error('Erro interno:', error)
  return NextResponse.json(
    { error: 'Ocorreu um erro. Tente novamente.' },
    { status: 500 }
  )
}
```

#### Passos de Verificação
- [ ] Nenhuma senha, token ou segredo nos logs
- [ ] Mensagens de erro genéricas para os usuários
- [ ] Erros detalhados apenas nos logs do servidor
- [ ] Nenhum stack trace exposto aos usuários

### 9. Segurança em Blockchain (Solana)

#### Verificação de Carteira
```typescript
import { verify } from '@solana/web3.js'

async function verifyWalletOwnership(
  publicKey: string,
  signature: string,
  message: string
) {
  try {
    const isValid = verify(
      Buffer.from(message),
      Buffer.from(signature, 'base64'),
      Buffer.from(publicKey, 'base64')
    )
    return isValid
  } catch (error) {
    return false
  }
}
```

#### Verificação de Transação
```typescript
async function verifyTransaction(transaction: Transaction) {
  // Verifique o destinatário
  if (transaction.to !== expectedRecipient) {
    throw new Error('Destinatário inválido')
  }

  // Verifique o valor
  if (transaction.amount > maxAmount) {
    throw new Error('Valor excede o limite')
  }

  // Verifique se o usuário tem saldo suficiente
  const balance = await getBalance(transaction.from)
  if (balance < transaction.amount) {
    throw new Error('Saldo insuficiente')
  }

  return true
}
```

#### Passos de Verificação
- [ ] Assinaturas de carteira verificadas
- [ ] Detalhes da transação validados
- [ ] Checagem de saldo antes das transações
- [ ] Nenhuma assinatura de transação às cegas

### 10. Segurança de Dependências

#### Atualizações Regulares
```bash
# Verificar vulnerabilidades
npm audit

# Corrigir automaticamente o que for possível
npm audit fix

# Atualizar dependências
npm update

# Verificar pacotes desatualizados
npm outdated
```

#### Lock Files
```bash
# SEMPRE faça commit dos lock files
git add package-lock.json

# Use no CI/CD para builds reproduzíveis
npm ci  # Em vez de npm install
```

#### Passos de Verificação
- [ ] Dependências atualizadas
- [ ] Nenhuma vulnerabilidade conhecida (npm audit limpo)
- [ ] Lock files commitados
- [ ] Dependabot ativado no GitHub
- [ ] Atualizações de segurança regulares

## Testes de Segurança

### Testes de Segurança Automatizados
```typescript
// Testar autenticação
test('exige autenticação', async () => {
  const response = await fetch('/api/protected')
  expect(response.status).toBe(401)
})

// Testar autorização
test('exige papel de admin', async () => {
  const response = await fetch('/api/admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  })
  expect(response.status).toBe(403)
})

// Testar validação de entrada
test('rejeita entrada inválida', async () => {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' })
  })
  expect(response.status).toBe(400)
})

// Testar rate limiting
test('aplica os limites de requisição', async () => {
  const requests = Array(101).fill(null).map(() =>
    fetch('/api/endpoint')
  )

  const responses = await Promise.all(requests)
  const tooManyRequests = responses.filter(r => r.status === 429)

  expect(tooManyRequests.length).toBeGreaterThan(0)
})
```

## Checklist de Segurança Antes do Deploy

Antes de QUALQUER deploy em produção:

- [ ] **Segredos**: nenhum segredo fixo no código, todos em variáveis de ambiente
- [ ] **Validação de Entrada**: todas as entradas do usuário validadas
- [ ] **SQL Injection**: todas as queries parametrizadas
- [ ] **XSS**: conteúdo do usuário sanitizado
- [ ] **CSRF**: proteção ativada
- [ ] **Autenticação**: tratamento correto de tokens
- [ ] **Autorização**: checagens de papel implementadas
- [ ] **Rate Limiting**: ativado em todos os endpoints
- [ ] **HTTPS**: obrigatório em produção
- [ ] **Headers de Segurança**: CSP e X-Frame-Options configurados
- [ ] **Tratamento de Erros**: nenhum dado sensível nos erros
- [ ] **Logs**: nenhum dado sensível registrado
- [ ] **Dependências**: atualizadas, sem vulnerabilidades
- [ ] **Row Level Security**: ativado no Supabase
- [ ] **CORS**: configurado corretamente
- [ ] **Upload de Arquivos**: validado (tamanho, tipo)
- [ ] **Assinaturas de Carteira**: verificadas (se houver blockchain)

## Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Segurança no Next.js](https://nextjs.org/docs/security)
- [Segurança no Supabase](https://supabase.com/docs/guides/auth)
- [Web Security Academy](https://portswigger.net/web-security)

---

**Lembre-se**: segurança não é opcional. Uma única vulnerabilidade pode comprometer a plataforma inteira. Na dúvida, prefira a cautela.
