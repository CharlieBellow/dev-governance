/**
 * Classe base abstrata para todas as exceções de regras de negócio do domínio.
 *
 * Motivo de existir: permite que camadas externas (ex.: Exception Filters do
 * NestJS, na infraestrutura) tratem QUALQUER erro de domínio de forma
 * centralizada, usando `instanceof DomainException`, sem precisar conhecer
 * cada subtipo específico (Princípio Aberto/Fechado - OCP).
 *
 * Nunca deve ser instanciada diretamente, apenas estendida.
 */
export abstract class DomainException extends Error {
  protected constructor(message: string) {
    super(message);

    // Necessário para preservar corretamente a cadeia de protótipos ao
    // estender uma classe nativa (Error) em TypeScript/JavaScript,
    // garantindo que `instanceof` funcione independentemente do "target"
    // de compilação configurado no tsconfig.json.
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
