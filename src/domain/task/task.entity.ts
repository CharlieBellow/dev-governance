import { randomUUID } from 'node:crypto';
import { TaskTitle } from './value-objects/task-title.vo';

/**
 * Formato de saída "achatado" (primitivos) da entidade Task, útil para
 * a camada de aplicação/infraestrutura consumir sem precisar conhecer
 * os Value Objects internos do domínio.
 */
export interface TaskProps {
  readonly id: string;
  readonly title: string;
  readonly isCompleted: boolean;
}

/**
 * Entidade de Domínio `Task`.
 *
 * Uma Entidade é definida pela sua identidade (`id`), e não pelos seus
 * atributos — duas tarefas com o mesmo título são tarefas diferentes,
 * desde que possuam `id`s distintos.
 *
 * Esta classe é 100% agnóstica de frameworks: não depende de NestJS,
 * Prisma ou qualquer biblioteca externa, apenas da API nativa do Node.js
 * (`node:crypto`) para geração de identificador único.
 */
export class Task {
  private readonly id: string;
  private readonly title: TaskTitle;
  private readonly isCompleted: boolean;

  // Construtor privado: força que toda instância passe pela factory
  // method `Task.create`, garantindo que a invariante de negócio
  // "toda tarefa nasce pendente" nunca seja violada.
  private constructor(id: string, title: TaskTitle, isCompleted: boolean) {
    this.id = id;
    this.title = title;
    this.isCompleted = isCompleted;
  }

  /**
   * Factory method responsável por criar uma nova Tarefa válida.
   *
   * Regras de negócio aplicadas (Spec 001):
   * - O título é validado pelo Value Object `TaskTitle` e lança
   *   `InvalidTaskTitleException` caso seja inválido.
   * - Toda tarefa nasce com `isCompleted: false`.
   * - O `id` é gerado internamente pelo próprio domínio (UUID v4),
   *   garantindo que a entidade já nasça com identidade completa.
   */
  public static create(title: string): Task {
    const taskTitle = TaskTitle.create(title);

    return new Task(randomUUID(), taskTitle, false);
  }

  public getId(): string {
    return this.id;
  }

  public getTitle(): string {
    return this.title.getValue();
  }

  public getIsCompleted(): boolean {
    return this.isCompleted;
  }

  /**
   * Converte a entidade para um objeto plano de primitivos, no formato
   * de saída definido na Spec 001 (id, title, isCompleted).
   */
  public toJSON(): TaskProps {
    return {
      id: this.id,
      title: this.title.getValue(),
      isCompleted: this.isCompleted,
    };
  }
}
