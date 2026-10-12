import { describe, expect, it } from 'vitest';
import { Task } from './task.entity';
import { InvalidTaskTitleException } from './exceptions/invalid-task-title.exception';

describe('Task (Entidade de Domínio)', () => {
  it('deve criar uma tarefa com sucesso quando o título for válido', () => {
    const task = Task.create('Estudar Clean Architecture');

    expect(task.getId()).toBeTypeOf('string');
    expect(task.getId().length).toBeGreaterThan(0);
    expect(task.getTitle()).toBe('Estudar Clean Architecture');
    expect(task.getIsCompleted()).toBe(false);
  });

  it('deve gerar um id único para cada tarefa criada', () => {
    const firstTask = Task.create('Primeira tarefa');
    const secondTask = Task.create('Segunda tarefa');

    expect(firstTask.getId()).not.toBe(secondTask.getId());
  });

  it('deve remover espaços em branco nas extremidades do título', () => {
    const task = Task.create('  Comprar leite  ');

    expect(task.getTitle()).toBe('Comprar leite');
  });

  it('deve lançar InvalidTaskTitleException quando o título for uma string vazia', () => {
    expect(() => Task.create('')).toThrow(InvalidTaskTitleException);
  });

  it('deve lançar InvalidTaskTitleException quando o título contiver apenas espaços em branco', () => {
    expect(() => Task.create('   ')).toThrow(InvalidTaskTitleException);
  });

  it('deve lançar InvalidTaskTitleException quando o título não for uma string', () => {
    expect(() => Task.create(undefined as unknown as string)).toThrow(
      InvalidTaskTitleException,
    );
    expect(() => Task.create(null as unknown as string)).toThrow(
      InvalidTaskTitleException,
    );
  });

  it('deve retornar o formato de saída esperado (id, title, isCompleted) via toJSON', () => {
    const task = Task.create('Aprender DDD');
    const output = task.toJSON();

    expect(output).toEqual({
      id: task.getId(),
      title: 'Aprender DDD',
      isCompleted: false,
    });
  });
});
