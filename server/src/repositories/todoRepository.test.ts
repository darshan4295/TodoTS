import { describe, it, expect, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { ok, err } from 'neverthrow';
import { TodoRepository } from './todoRepository';
import { InternalUpdateTodoRequest, Todo } from '../types/todo';
import { CreateTodoRequest } from '../../../client/src/types/api';

describe('TodoRepository Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let directDb: Db; // Direct connection for test setup
  let directClient: MongoClient;
  let repository: TodoRepository;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();

    const mongoUri = mongoServer.getUri();
    const dbName = `test-todoapp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Connection for repository
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(dbName);
    repository = new TodoRepository(db);

    // Direct connection for test setup (bypassing repository)
    directClient = new MongoClient(mongoUri);
    await directClient.connect();
    directDb = directClient.db(dbName);
  });

  afterEach(async () => {
    await client.close();
    await directClient.close();
    await mongoServer.stop();
  });

  describe('Soft Deletion Functionality', () => {
    it('should soft delete a todo by setting status to deleted', async () => {
      // Setup: Insert a todo directly in the database
      const todoData = {
        schemaVersion: 1,
        id: 'test-todo-1',
        title: 'Test Todo',
        description: 'Test Description',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await directDb.collection('todos').insertOne(todoData);

      // Act: Delete the todo through the repository
      const result = await repository.delete('test-todo-1');

      // Assert: Operation should succeed
      expect(result).toMatchObject(ok(true));

      // Verify: Check that the todo is marked as deleted in the database
      const deletedTodo = await directDb.collection('todos').findOne({ id: 'test-todo-1' });
      expect(deletedTodo).toBeDefined();
      expect(deletedTodo?.['status']).toBe('deleted');
      expect(deletedTodo?.['updatedAt']).toBeInstanceOf(Date);
    });

    it('should return not found error when trying to delete a non-existent todo', async () => {
      // Act: Try to delete a non-existent todo
      const result = await repository.delete('non-existent-id');

      // Assert: Should return not found error
      expect(result).toMatchObject(
        err({
          type: 'NOT_FOUND',
          message: 'Todo with id non-existent-id not found',
        }),
      );
    });

    it('should return not found error when trying to delete an already deleted todo', async () => {
      // Setup: Insert a deleted todo directly in the database
      const deletedTodoData = {
        schemaVersion: 1,
        id: 'deleted-todo-1',
        title: 'Deleted Todo',
        description: 'Already deleted',
        status: 'deleted',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await directDb.collection('todos').insertOne(deletedTodoData);

      // Act: Try to delete the already deleted todo
      const result = await repository.delete('deleted-todo-1');

      // Assert: Should return not found error
      expect(result).toMatchObject(
        err({
          type: 'NOT_FOUND',
        }),
      );
    });
  });

  describe('Filtering Deleted Todos', () => {
    beforeEach(async () => {
      // Setup: Insert test data with mixed statuses
      const testData = [
        {
          schemaVersion: 1,
          id: 'pending-todo-1',
          title: 'Pending Todo 1',
          status: 'pending',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        {
          schemaVersion: 1,
          id: 'completed-todo-1',
          title: 'Completed Todo 1',
          status: 'completed',
          completionMessage: 'Done!',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        },
        {
          schemaVersion: 1,
          id: 'deleted-todo-1',
          title: 'Deleted Todo 1',
          status: 'deleted',
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-03'),
        },
        {
          schemaVersion: 1,
          id: 'pending-todo-2',
          title: 'Pending Todo 2',
          status: 'pending',
          createdAt: new Date('2023-01-04'),
          updatedAt: new Date('2023-01-04'),
        },
      ];
      await directDb.collection('todos').insertMany(testData);
    });

    it('should exclude deleted todos from findAll', async () => {
      // Act: Get all todos through repository
      const result = await repository.findAll();

      // Assert: Should return only non-deleted todos
      const expectedTodos = expect.arrayContaining([
        expect.objectContaining({
          id: 'pending-todo-1',
          status: 'pending',
          title: 'Pending Todo 1',
        }),
        expect.objectContaining({
          id: 'completed-todo-1',
          status: 'completed',
          title: 'Completed Todo 1',
        }),
        expect.objectContaining({
          id: 'pending-todo-2',
          status: 'pending',
          title: 'Pending Todo 2',
        }),
      ]);

      expect(result).toMatchObject(ok(expectedTodos));

      // Additional verification that we have exactly 3 todos and no deleted ones
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
        const todoIds = result.value.map((todo: Todo) => todo.id);
        expect(todoIds).not.toContain('deleted-todo-1');
      }
    });

    it('should exclude deleted todos from findById', async () => {
      // Act: Try to find a deleted todo by ID
      const result = await repository.findById('deleted-todo-1');

      // Assert: Should return not found error
      expect(result).toMatchObject(
        err({
          type: 'NOT_FOUND',
          message: 'Todo with id deleted-todo-1 not found',
        }),
      );
    });

    it('should find non-deleted todos by ID', async () => {
      // Act: Find a pending todo by ID
      const result = await repository.findById('pending-todo-1');

      // Assert: Should return the todo
      expect(result).toMatchObject(
        ok({
          id: 'pending-todo-1',
          status: 'pending',
          title: 'Pending Todo 1',
        }),
      );
    });

    it('should exclude deleted todos from update operations', async () => {
      // Act: Try to update a deleted todo
      const updateData: InternalUpdateTodoRequest = {
        title: 'Updated Title',
        status: 'pending',
      };
      const result = await repository.update('deleted-todo-1', updateData);

      // Assert: Should return not found error
      expect(result).toMatchObject(
        err({
          type: 'NOT_FOUND',
          message: 'Todo with id deleted-todo-1 not found',
        }),
      );
    });

    it('should successfully update non-deleted todos', async () => {
      // Act: Update a pending todo
      const updateData: InternalUpdateTodoRequest = {
        title: 'Updated Pending Todo',
        status: 'completed',
        completionMessage: 'Task completed!',
      };
      const result = await repository.update('pending-todo-1', updateData);

      // Assert: Should successfully update
      expect(result).toMatchObject(
        ok({
          id: 'pending-todo-1',
          title: 'Updated Pending Todo',
          status: 'completed',
          completionMessage: 'Task completed!',
        }),
      );
    });
  });

  describe('Create Operation', () => {
    it('should create a new todo with pending status', async () => {
      // Act: Create a new todo
      const createData: CreateTodoRequest = {
        title: 'New Todo',
        description: 'New Description',
      };
      const result = await repository.create(createData);

      // Assert: Should create successfully
      expect(result).toMatchObject(
        ok({
          title: 'New Todo',
          description: 'New Description',
          status: 'pending',
          id: expect.any(String),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );

      // Verify in database
      if (result.isOk()) {
        const dbTodo = await directDb.collection('todos').findOne({ id: result.value.id });
        expect(dbTodo).toBeDefined();
        expect(dbTodo?.['status']).toBe('pending');
      }
    });

    it('should create a new todo without description', async () => {
      // Act: Create a new todo without description
      const createData: CreateTodoRequest = {
        title: 'Todo without description',
      };
      const result = await repository.create(createData);

      // Assert: Should create successfully
      expect(result).toMatchObject(
        ok({
          title: 'Todo without description',
          status: 'pending',
        }),
      );

      // Verify description is undefined
      if (result.isOk()) {
        expect(result.value.description).toBeUndefined();
      }
    });
  });

  describe('Database Consistency', () => {
    it('should maintain referential integrity after soft deletion', async () => {
      // Setup: Create a todo through repository
      const createData: CreateTodoRequest = {
        title: 'Test Todo for Deletion',
        description: 'Will be deleted',
      };
      const createResult = await repository.create(createData);
      expect(createResult).toMatchObject(
        ok({
          title: 'Test Todo for Deletion',
          description: 'Will be deleted',
        }),
      );

      if (createResult.isOk()) {
        const todoId = createResult.value.id;

        // Act: Delete the todo
        const deleteResult = await repository.delete(todoId);
        expect(deleteResult).toMatchObject(ok(true));

        // Assert: Todo should still exist in database but marked as deleted
        const dbTodo = await directDb.collection('todos').findOne({ id: todoId });
        expect(dbTodo).toBeDefined();
        expect(dbTodo?.['status']).toBe('deleted');
        expect(dbTodo?.['title']).toBe('Test Todo for Deletion');
        expect(dbTodo?.['description']).toBe('Will be deleted');

        // Assert: Repository should not find the deleted todo
        const findResult = await repository.findById(todoId);
        expect(findResult).toMatchObject(
          err({
            type: 'NOT_FOUND',
          }),
        );
      }
    });

    it('should handle concurrent operations correctly', async () => {
      // Setup: Create a todo
      const createData: CreateTodoRequest = {
        title: 'Concurrent Test Todo',
      };
      const createResult = await repository.create(createData);
      expect(createResult).toMatchObject(
        ok({
          title: 'Concurrent Test Todo',
        }),
      );

      if (createResult.isOk()) {
        const todoId = createResult.value.id;

        // Act: Perform concurrent update and delete operations
        const updatePromise = repository.update(todoId, { title: 'Updated Title' });
        const deletePromise = repository.delete(todoId);

        const [updateResult, deleteResult] = await Promise.all([updatePromise, deletePromise]);

        // Assert: Both operations could succeed in different orders
        // If update happens first, delete should fail
        // If delete happens first, update should fail
        // But it's also possible both succeed if they don't interfere
        const successfulOps = [updateResult.isOk(), deleteResult.isOk()].filter(Boolean);
        expect(successfulOps.length).toBeGreaterThanOrEqual(1);

        // Check that if an operation fails, it's due to NOT_FOUND
        if (updateResult.isErr()) {
          expect(updateResult.error.type).toBe('NOT_FOUND');
        }
        if (deleteResult.isErr()) {
          expect(deleteResult.error.type).toBe('NOT_FOUND');
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty collection gracefully', async () => {
      // Act: Try to find all todos in empty collection
      const result = await repository.findAll();

      // Assert: Should return empty array
      expect(result).toMatchObject(ok([]));
    });

    it('should handle collection with only deleted todos', async () => {
      // Setup: Insert only deleted todos
      const deletedTodos = [
        {
          schemaVersion: 1,
          id: 'deleted-1',
          title: 'Deleted Todo 1',
          status: 'deleted',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          schemaVersion: 1,
          id: 'deleted-2',
          title: 'Deleted Todo 2',
          status: 'deleted',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      await directDb.collection('todos').insertMany(deletedTodos);

      // Act: Try to find all todos
      const result = await repository.findAll();

      // Assert: Should return empty array
      expect(result).toMatchObject(ok([]));
    });

    it('should properly handle todos with undefined description after deletion', async () => {
      // Setup: Insert a todo without description
      const todoData = {
        schemaVersion: 1,
        id: 'no-desc-todo',
        title: 'Todo without description',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await directDb.collection('todos').insertOne(todoData);

      // Act: Delete the todo
      const deleteResult = await repository.delete('no-desc-todo');

      // Assert: Should succeed
      expect(deleteResult).toMatchObject(ok(true));

      // Verify: Check database state
      const dbTodo = await directDb.collection('todos').findOne({ id: 'no-desc-todo' });
      expect(dbTodo).toBeDefined();
      expect(dbTodo?.['status']).toBe('deleted');
      expect(dbTodo?.['description']).toBeUndefined();
    });
  });
});
