import { DomainException } from '../../exceptions/domain.exception';

/**
 * Lançada quando o título de uma Tarefa não atende à regra de negócio
 * central definida na Spec 001: não pode ser vazio, nulo/indefinido,
 * nem conter apenas espaços em branco.
 */
export class InvalidTaskTitleException extends DomainException {
  constructor(message = 'O título da tarefa não pode estar vazio.') {
    super(message);
  }
}
