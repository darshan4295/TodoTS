import { err, ok, Result } from 'neverthrow';
import { Todo, InternalUpdateTodoRequest } from '../types/todo';
import { CreateTodoRequest } from '../../../client/src/types/api';
import { TodoRepository } from '../repositories/todoRepository';
import { AppError } from '../types/errors';

export class TodoService {
  constructor(private todoRepository: TodoRepository) {}

  async getAllTodos(): Promise<Result<Todo[], AppError>> {
    return await this.todoRepository.findAll();
  }

  async getTodoById(id: string): Promise<Result<Todo, AppError>> {
    return await this.todoRepository.findById(id);
  }

  async createTodo(todoData: CreateTodoRequest): Promise<Result<Todo, AppError>> {
    return await this.todoRepository.create(todoData);
  }

  async updateTodo(id: string, updates: InternalUpdateTodoRequest): Promise<Result<Todo, AppError>> {
    return await this.todoRepository.update(id, updates);
  }

  async deleteTodo(id: string): Promise<Result<boolean, AppError>> {
    return await this.todoRepository.delete(id);
  }

  async getCompletedTodos(): Promise<Result<Todo[], AppError>> {
    const allTodosResult = await this.todoRepository.findAll();
    if (allTodosResult.isErr()) {
      return err(allTodosResult.error);
    }
    const filteredTodos = allTodosResult.value.filter((todo) => todo.status === 'completed');
    return ok(filteredTodos);
  }

  async getPendingTodos(): Promise<Result<Todo[], AppError>> {
    const allTodosResult = await this.todoRepository.findAll();
    if (allTodosResult.isErr()) {
      return err(allTodosResult.error);
    }
    const filteredTodos = allTodosResult.value.filter((todo) => todo.status === 'pending');
    return ok(filteredTodos);
  }
}
