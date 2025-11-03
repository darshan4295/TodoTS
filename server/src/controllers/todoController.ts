import { Request, Response } from 'express';
import { TodoService } from '../services/todoService';
import { CreateTodoRequest, UpdateTodoRequest, ApiTodo } from '../../../client/src/types/api';
import { InternalUpdateTodoRequest, Todo } from '../types/todo';
import { AppError, createValidationError } from '../types/errors';

export class TodoController {
  private todoService: TodoService;

  constructor(todoService: TodoService) {
    this.todoService = todoService;
  }

  private todoToApiTodo(todo: Todo): ApiTodo {
    if (todo.status === 'completed') {
      const apiTodo: ApiTodo = {
        id: todo.id,
        title: todo.title,
        completed: true,
        completionMessage: todo.completionMessage,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      };
      if (todo.description !== undefined) {
        apiTodo.description = todo.description;
      }
      return apiTodo;
    } else {
      const apiTodo: ApiTodo = {
        id: todo.id,
        title: todo.title,
        completed: false,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      };
      if (todo.description !== undefined) {
        apiTodo.description = todo.description;
      }
      return apiTodo;
    }
  }

  private todosToApiTodos(todos: Todo[]): ApiTodo[] {
    return todos.map((todo) => this.todoToApiTodo(todo));
  }

  private handleError(res: Response, error: AppError): void {
    console.error('Error in TodoController:', error);

    switch (error.type) {
      case 'NOT_FOUND':
        res.status(404).json({
          error: 'Resource not found',
          message: error.message,
          resource: error.resource,
          id: error.id,
        });
        break;
      case 'VALIDATION_ERROR':
        res.status(400).json({
          error: 'Validation error',
          message: error.message,
          field: error.field,
        });
        break;
      case 'DATABASE_ERROR':
      default:
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred',
        });
        break;
    }
  }

  getAllTodos = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.todoService.getAllTodos();

    if (result.isOk()) {
      res.json(this.todosToApiTodos(result.value));
    } else {
      this.handleError(res, result.error);
    }
  };

  getTodoById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const result = await this.todoService.getTodoById(id!);

    if (result.isOk()) {
      res.json(this.todoToApiTodo(result.value));
    } else {
      this.handleError(res, result.error);
    }
  };

  createTodo = async (req: Request, res: Response): Promise<void> => {
    const { title, description }: CreateTodoRequest = req.body;
    const createRequest: CreateTodoRequest = { title };
    if (description !== undefined) {
      createRequest.description = description;
    }
    const result = await this.todoService.createTodo(createRequest);

    if (result.isOk()) {
      res.status(201).json(this.todoToApiTodo(result.value));
    } else {
      this.handleError(res, result.error);
    }
  };

  updateTodo = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const apiUpdates: UpdateTodoRequest = req.body;

    const internalUpdates: InternalUpdateTodoRequest = {};

    if (apiUpdates.title !== undefined) {
      internalUpdates.title = apiUpdates.title;
    }
    if (apiUpdates.description !== undefined) {
      internalUpdates.description = apiUpdates.description;
    }
    if (apiUpdates.completed !== undefined) {
      if (apiUpdates.completed) {
        // Validate that completion message is provided when marking as completed
        if (!apiUpdates.completionMessage || apiUpdates.completionMessage.trim() === '') {
          return this.handleError(
            res,
            createValidationError('Completion message is required when marking todo as completed', 'completionMessage'),
          );
        }
        internalUpdates.status = 'completed';
        internalUpdates.completionMessage = apiUpdates.completionMessage;
      } else {
        internalUpdates.status = 'pending';
      }
    }

    const result = await this.todoService.updateTodo(id!, internalUpdates);

    if (result.isOk()) {
      res.json(this.todoToApiTodo(result.value));
    } else {
      this.handleError(res, result.error);
    }
  };

  deleteTodo = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const result = await this.todoService.deleteTodo(id!);

    if (result.isOk()) {
      res.status(204).send();
    } else {
      this.handleError(res, result.error);
    }
  };

  getCompletedTodos = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.todoService.getCompletedTodos();

    if (result.isOk()) {
      res.json(this.todosToApiTodos(result.value));
    } else {
      this.handleError(res, result.error);
    }
  };

  getPendingTodos = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.todoService.getPendingTodos();

    if (result.isOk()) {
      res.json(this.todosToApiTodos(result.value));
    } else {
      this.handleError(res, result.error);
    }
  };
}
