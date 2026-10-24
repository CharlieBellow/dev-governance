---
name: nestjs-patterns
description: Padrões de arquitetura NestJS para módulos, controllers, providers, validação de DTOs, guards, interceptors, configuração e backends TypeScript prontos para produção. Use ao construir ou revisar um backend NestJS — módulos, providers, validação de DTOs, guards ou interceptors.
metadata:
  origin: ECC
---

# Padrões de Desenvolvimento NestJS

Padrões NestJS prontos para produção em backends TypeScript modulares.

## Quando Ativar

- Ao construir APIs ou serviços NestJS
- Ao estruturar módulos, controllers e providers
- Ao adicionar validação de DTOs, guards, interceptors ou exception filters
- Ao configurar settings por ambiente e integrações com banco de dados
- Ao testar unidades NestJS ou endpoints HTTP

## Estrutura do Projeto

```text
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
│   ├── configuration.ts
│   └── validation.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   └── users/
│       ├── dto/
│       ├── entities/
│       ├── users.controller.ts
│       ├── users.module.ts
│       └── users.service.ts
└── prisma/ ou database/
```

- Mantenha o código de domínio dentro dos módulos de funcionalidade.
- Coloque filters, decorators, guards e interceptors transversais em `common/`.
- Mantenha os DTOs próximos do módulo que os possui.

## Bootstrap e Validação Global

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- Sempre ative `whitelist` e `forbidNonWhitelisted` em APIs públicas.
- Prefira um único pipe de validação global em vez de repetir a configuração por rota.

## Módulos, Controllers e Providers

```ts
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async create(dto: CreateUserDto) {
    return this.usersRepo.create(dto);
  }
}
```

- Controllers devem ser finos: interpretam a entrada HTTP, chamam um provider e retornam DTOs de resposta.
- Coloque a lógica de negócio em services injetáveis, não nos controllers.
- Exporte apenas os providers de que outros módulos realmente precisam.

## DTOs e Validação

```ts
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

- Valide todo DTO de requisição com `class-validator`.
- Use DTOs de resposta ou serializers dedicados em vez de retornar entidades do ORM diretamente.
- Evite vazar campos internos, como hashes de senha, tokens ou colunas de auditoria.

## Autenticação, Guards e Contexto da Requisição

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin/report')
getAdminReport(@Req() req: AuthenticatedRequest) {
  return this.reportService.getForUser(req.user.id);
}
```

- Mantenha estratégias de autenticação e guards locais ao módulo, a menos que sejam realmente compartilhados.
- Codifique regras de acesso amplas nos guards e faça a autorização específica do recurso nos services.
- Prefira tipos explícitos para objetos de requisição autenticada.

## Exception Filters e Formato do Erro

```ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json({
        path: request.url,
        error: exception.getResponse(),
      });
    }

    return response.status(500).json({
      path: request.url,
      error: 'Internal server error',
    });
  }
}
```

- Mantenha um envelope de erro consistente em toda a API.
- Lance exceções do framework para erros esperados do cliente; registre em log e encapsule falhas inesperadas de forma centralizada.

## Configuração e Validação do Ambiente

```ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [configuration],
  validate: validateEnv,
});
```

- Valide as variáveis de ambiente no boot, não de forma preguiçosa na primeira requisição.
- Mantenha o acesso à configuração atrás de helpers tipados ou services de configuração.
- Separe as particularidades de dev/staging/prod nas factories de configuração, em vez de espalhar condicionais pelo código das funcionalidades.

## Persistência e Transações

- Mantenha o código de repositório / ORM atrás de providers que falam a linguagem do domínio.
- Com Prisma ou TypeORM, isole fluxos transacionais em services que sejam donos da unidade de trabalho.
- Não deixe controllers coordenarem escritas de várias etapas diretamente.

## Testes

```ts
describe('UsersController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
});
```

- Teste providers de forma isolada, com dependências mockadas.
- Adicione testes no nível da requisição para guards, pipes de validação e exception filters.
- Use nos testes os mesmos pipes/filters globais usados em produção.

## Padrões para Produção

- Ative logs estruturados e IDs de correlação de requisição.
- Encerre a aplicação se o ambiente/configuração for inválido, em vez de subir parcialmente.
- Prefira inicialização assíncrona de providers para clientes de banco/cache, com health checks explícitos.
- Mantenha jobs em background e consumidores de eventos em módulos próprios, não dentro de controllers HTTP.
- Deixe explícitos rate limiting, autenticação e logs de auditoria em endpoints públicos.
