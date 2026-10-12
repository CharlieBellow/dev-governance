import { describe, expect, it } from 'vitest';
import { TaskTitle } from './task-title.vo';
import { InvalidTaskTitleException } from '../exceptions/invalid-task-title.exception';

describe('TaskTitle (Value Object)', () => {
  it('deve criar um título válido a partir de uma string não vazia', () => {
    const title = TaskTitle.create('Lavar o carro');

    expect(title.getValue()).toBe('Lavar o carro');
  });

  it('deve remover espaços em branco nas extremidades', () => {
    const title = TaskTitle.create('  Lavar o carro  ');

    expect(title.getValue()).toBe('Lavar o carro');
  });

  it('deve considerar iguais dois títulos com o mesmo valor', () => {
    const first = TaskTitle.create('Estudar');
    const second = TaskTitle.create('Estudar');

    expect(first.equals(second)).toBe(true);
  });

  it('deve considerar diferentes dois títulos com valores distintos', () => {
    const first = TaskTitle.create('Estudar');
    const second = TaskTitle.create('Trabalhar');

    expect(first.equals(second)).toBe(false);
  });

  it.each(['', '   ', undefined, null, 123])(
    'deve lançar InvalidTaskTitleException para o valor inválido: %s',
    (invalidValue) => {
      expect(() => TaskTitle.create(invalidValue)).toThrow(
        InvalidTaskTitleException,
      );
    },
  );
});
