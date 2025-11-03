import { describe, it, expect, beforeEach } from 'vitest';
import { instance, mock, when, verify } from 'ts-mockito';
import { ok, err } from 'neverthrow';
import { TodoService } from './todoService';
import { TodoRepository } from '../repositories/todoRepository';
import { Todo } from '../types/todo';
import { CreateTodoRequest } from '../../../client/src/types/api';
import { createDatabaseError, createNotFoundError } from '../types/errors';

describe('TodoService', () => {
  let todoService: TodoService;
  let mockTodoRepository: TodoRepository;

  const sampleTodo: Todo = {
    id: 'test-id-1',
    title: 'Test Todo',
    description: 'Test Description',
    status: 'pending',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const sampleTodo2: Todo = {
    id: 'test-id-2',
    title: 'Test Todo 2',
    description: 'Test Description 2',
    status: 'completed',
    completionMessage: 'Task completed successfully',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  };

  beforeEach(() => {
    mockTodoRepository = mock<TodoRepository>();
    todoService = new TodoService(instance(mockTodoRepository));
  });

  describe('getAllTodos', () => {
    it('should return all todos from repository', async () => {
      const expectedTodos = [sampleTodo, sampleTodo2];
      when(mockTodoRepository.findAll()).thenResolve(ok(expectedTodos));

      const result = await todoService.getAllTodos();

      expect(result).toMatchObject(ok(expectedTodos));
      verify(mockTodoRepository.findAll()).once();
    });

    it('should return empty array when no todos exist', async () => {
      when(mockTodoRepository.findAll()).thenResolve(ok([]));

      const result = await todoService.getAllTodos();

      expect(result).toMatchObject(ok([]));
      verify(mockTodoRepository.findAll()).once();
    });

    it('should return error when repository fails', async () => {
      const error = createDatabaseError('Failed to retrieve todos');
      when(mockTodoRepository.findAll()).thenResolve(err(error));

      const result = await todoService.getAllTodos();

      expect(result).toMatchObject(err(error));
      verify(mockTodoRepository.findAll()).once();
    });
  });

  describe('getTodoById', () => {
    it('should return todo when found', async () => {
      when(mockTodoRepository.findById('test-id-1')).thenResolve(ok(sampleTodo));

      const result = await todoService.getTodoById('test-id-1');

      expect(result).toMatchObject(ok(sampleTodo));
      verify(mockTodoRepository.findById('test-id-1')).once();
    });

    it('should return NotFoundError when todo not found', async () => {
      const notFoundError = createNotFoundError('Todo', 'non-existent-id');
      when(mockTodoRepository.findById('non-existent-id')).thenResolve(err(notFoundError));

      const result = await todoService.getTodoById('non-existent-id');

      expect(result).toMatchObject(err(notFoundError));
      verify(mockTodoRepository.findById('non-existent-id')).once();
    });

    it('should return error when repository fails', async () => {
      const error = createDatabaseError('Failed to retrieve todo by id');
      when(mockTodoRepository.findById('test-id-1')).thenResolve(err(error));

      const result = await todoService.getTodoById('test-id-1');

      expect(result).toMatchObject(err(error));
      verify(mockTodoRepository.findById('test-id-1')).once();
    });
  });

  describe('createTodo', () => {
    it('should create a new todo', async () => {
      const todoData: CreateTodoRequest = {
        title: 'New Todo',
        description: 'New Description',
      };
      const createdTodo: Todo = {
        id: 'new-id',
        title: todoData.title,
        description: todoData.description!,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      when(mockTodoRepository.create(todoData)).thenResolve(ok(createdTodo));

      const result = await todoService.createTodo(todoData);

      expect(result).toMatchObject(ok(createdTodo));
      verify(mockTodoRepository.create(todoData)).once();
    });

    it('should create todo without description', async () => {
      const todoData: CreateTodoRequest = {
        title: 'New Todo',
      };
      const createdTodo: Todo = {
        id: 'new-id',
        title: todoData.title,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      when(mockTodoRepository.create(todoData)).thenResolve(ok(createdTodo));

      const result = await todoService.createTodo(todoData);

      expect(result).toMatchObject(ok(createdTodo));
      verify(mockTodoRepository.create(todoData)).once();
    });

    it('should return error when repository fails', async () => {
      const todoData: CreateTodoRequest = {
        title: 'New Todo',
      };
      const error = createDatabaseError('Failed to create todo');
      when(mockTodoRepository.create(todoData)).thenResolve(err(error));

      const result = await todoService.createTodo(todoData);

      expect(result).toMatchObject(err(error));
      verify(mockTodoRepository.create(todoData)).once();
    });
  });

  describe('updateTodo', () => {
    it('should update todo when found', async () => {
      const updates = {
        title: 'Updated Title',
        status: 'completed' as const,
        completionMessage: 'Task completed successfully',
      };
      const updatedTodo: Todo = {
        ...sampleTodo,
        title: updates.title,
        status: 'completed',
        completionMessage: updates.completionMessage,
        updatedAt: new Date(),
      };

      when(mockTodoRepository.update('test-id-1', updates)).thenResolve(ok(updatedTodo));

      const result = await todoService.updateTodo('test-id-1', updates);

      expect(result).toMatchObject(ok(updatedTodo));
      verify(mockTodoRepository.update('test-id-1', updates)).once();
    });

    it('should return NotFoundError when todo not found', async () => {
      const updates = {
        title: 'Updated Title',
      };
      const notFoundError = createNotFoundError('Todo', 'non-existent-id');

      when(mockTodoRepository.update('non-existent-id', updates)).thenResolve(err(notFoundError));

      const result = await todoService.updateTodo('non-existent-id', updates);

      expect(result).toMatchObject(err(notFoundError));
      verify(mockTodoRepository.update('non-existent-id', updates)).once();
    });
  });

  describe('deleteTodo', () => {
    it('should return true when todo is deleted', async () => {
      when(mockTodoRepository.delete('test-id-1')).thenResolve(ok(true));

      const result = await todoService.deleteTodo('test-id-1');

      expect(result).toMatchObject(ok(true));
      verify(mockTodoRepository.delete('test-id-1')).once();
    });

    it('should return NotFoundError when todo not found', async () => {
      const notFoundError = createNotFoundError('Todo', 'non-existent-id');
      when(mockTodoRepository.delete('non-existent-id')).thenResolve(err(notFoundError));

      const result = await todoService.deleteTodo('non-existent-id');

      expect(result).toMatchObject(err(notFoundError));
      verify(mockTodoRepository.delete('non-existent-id')).once();
    });
  });

  describe('getCompletedTodos', () => {
    it('should return only completed todos', async () => {
      const allTodos = [sampleTodo, sampleTodo2]; // sampleTodo2 is completed
      const completedTodos = [sampleTodo2];

      when(mockTodoRepository.findAll()).thenResolve(ok(allTodos));

      const result = await todoService.getCompletedTodos();

      expect(result).toMatchObject(ok(completedTodos));
      verify(mockTodoRepository.findAll()).once();
    });

    it('should return empty array when no completed todos', async () => {
      const allTodos = [sampleTodo]; // only pending todos

      when(mockTodoRepository.findAll()).thenResolve(ok(allTodos));

      const result = await todoService.getCompletedTodos();

      expect(result).toMatchObject(ok([]));
      verify(mockTodoRepository.findAll()).once();
    });

    it('should return empty array when no todos exist', async () => {
      when(mockTodoRepository.findAll()).thenResolve(ok([]));

      const result = await todoService.getCompletedTodos();

      expect(result).toMatchObject(ok([]));
      verify(mockTodoRepository.findAll()).once();
    });

    it('should return error when repository fails', async () => {
      const error = createDatabaseError('Failed to retrieve todos');
      when(mockTodoRepository.findAll()).thenResolve(err(error));

      const result = await todoService.getCompletedTodos();

      expect(result).toMatchObject(err(error));
      verify(mockTodoRepository.findAll()).once();
    });
  });

  describe('getPendingTodos', () => {
    it('should return only pending todos', async () => {
      const allTodos = [sampleTodo, sampleTodo2]; // sampleTodo is pending
      const pendingTodos = [sampleTodo];

      when(mockTodoRepository.findAll()).thenResolve(ok(allTodos));

      const result = await todoService.getPendingTodos();

      expect(result).toMatchObject(ok(pendingTodos));
      verify(mockTodoRepository.findAll()).once();
    });

    it('should return empty array when no pending todos', async () => {
      const allTodos = [sampleTodo2]; // only completed todos

      when(mockTodoRepository.findAll()).thenResolve(ok(allTodos));

      const result = await todoService.getPendingTodos();

      expect(result).toMatchObject(ok([]));
      verify(mockTodoRepository.findAll()).once();
    });

    it('should return empty array when no todos exist', async () => {
      when(mockTodoRepository.findAll()).thenResolve(ok([]));

      const result = await todoService.getPendingTodos();

      expect(result).toMatchObject(ok([]));
      verify(mockTodoRepository.findAll()).once();
    });

    it('should return error when repository fails', async () => {
      const error = createDatabaseError('Failed to retrieve todos');
      when(mockTodoRepository.findAll()).thenResolve(err(error));

      const result = await todoService.getPendingTodos();

      expect(result).toMatchObject(err(error));
      verify(mockTodoRepository.findAll()).once();
    });
  });
});
