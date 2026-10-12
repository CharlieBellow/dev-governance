import { InvalidTaskTitleException } from '../exceptions/invalid-task-title.exception';

/**
 * Value Object que representa o título de uma Tarefa.
 *
 * Por que um Value Object e não apenas uma `string` na entidade `Task`?
 * 1. Single Responsibility: a regra "o que é um título válido" fica
 *    concentrada em um único lugar, evitando duplicação (DRY) caso outros
 *    pontos do sistema (ex.: um futuro caso de uso de edição) precisem
 *    validar o mesmo dado.
 * 2. Imutabilidade: uma vez criado, o valor não pode ser alterado por fora
 *    da validação, protegendo a invariante de negócio.
 * 3. Comparação por valor: dois `TaskTitle` com o mesmo texto são
 *    considerados iguais, diferente de uma Entidade, que é identificada
 *    pelo seu `id` (distinção clássica de DDD entre Entity e Value Object).
 */
export class TaskTitle {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(rawTitle: unknown): TaskTitle {
    if (typeof rawTitle !== 'string' || rawTitle.trim().length === 0) {
      throw new InvalidTaskTitleException();
    }

    return new TaskTitle(rawTitle.trim());
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: TaskTitle): boolean {
    return this.value === other.value;
  }
}
