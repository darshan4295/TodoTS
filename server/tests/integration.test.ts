import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TodoApplication } from '../src/app';
import { Database } from '../src/config/database';

type TodoResponse = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

describe('Todo API Integration Tests', () => {
  let app: TodoApplication;
  let apiClient: AxiosInstance;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Set environment variables for test database
    process.env['MONGO_URI'] = `${mongoUri}test_todoapp`;

    // Create application instance
    app = new TodoApplication();

    // Start server on port 0 (let OS choose available port)
    await app.start(0);

    // Create axios instance with base configuration
    apiClient = axios.create({
      baseURL: app.getAddress()!,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on HTTP error status codes
    });
  });

  afterAll(async () => {
    // Stop server and database
    if (app) {
      await app.stop();
    }

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    const database = Database.getInstance();
    if (database.isConnected()) {
      const db = database.getDb();
      await db.collection('todos').deleteMany({});
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await apiClient.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Todo CRUD Operations', () => {
    describe('POST /api/todos - Create Todo', () => {
      it('should create a new todo with title and description', async () => {
        const todoData = {
          title: 'Integration Test Todo',
          description: 'This is a test todo created by integration tests',
        };

        const response = await apiClient.post('/api/todos', todoData);

        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          id: expect.any(String),
          title: todoData.title,
          description: todoData.description,
          completed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should create a todo with only title', async () => {
        const todoData = {
          title: 'Todo without description',
        };

        const response = await apiClient.post('/api/todos', todoData);

        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          id: expect.any(String),
          title: todoData.title,
          completed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
        expect(response.data.description).toBeUndefined();
      });

      it('should reject todo creation without title', async () => {
        const todoData = {
          description: 'No title provided',
        };

        const response = await apiClient.post('/api/todos', todoData);

        expect(response.status).toBe(400);
        expect(response.data.message).toContain('title');
        expect(response.data.errors).toBeDefined();
      });

      it('should reject todo with title too long', async () => {
        const todoData = {
          title: 'x'.repeat(256), // Exceeds 255 character limit
        };

        const response = await apiClient.post('/api/todos', todoData);

        expect(response.status).toBe(400);
        expect(response.data.message).toContain('title');
      });

      it('should reject todo with description too long', async () => {
        const todoData = {
          title: 'Valid title',
          description: 'x'.repeat(1001), // Exceeds 1000 character limit
        };

        const response = await apiClient.post('/api/todos', todoData);

        expect(response.status).toBe(400);
        expect(response.data.message).toContain('description');
      });
    });

    describe('GET /api/todos - Get All Todos', () => {
      it('should return all todos', async () => {
        // Create a todo first
        await apiClient.post('/api/todos', {
          title: 'Test Todo for Get All',
          description: 'Test Description',
        });

        const response = await apiClient.get('/api/todos');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);

        // Check that each todo has the expected structure
        response.data.forEach((todo: TodoResponse) => {
          expect(todo).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            completed: expect.any(Boolean),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          });
        });
      });
    });

    describe('GET /api/todos/:id - Get Todo by ID', () => {
      it('should return a specific todo by ID', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Integration Test Todo',
          description: 'This is a test todo created by integration tests',
        });
        const todoId = createResponse.data.id;

        const response = await apiClient.get(`/api/todos/${todoId}`);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          id: todoId,
          title: 'Integration Test Todo',
          description: 'This is a test todo created by integration tests',
          completed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should return 404 for non-existent todo', async () => {
        const fakeId = '123e4567-e89b-12d3-a456-426614174000';

        const response = await apiClient.get(`/api/todos/${fakeId}`);

        expect(response.status).toBe(404);
        expect(response.data.error).toBe('Resource not found');
        expect(response.data.message).toBe(`Todo with id ${fakeId} not found`);
        expect(response.data.resource).toBe('Todo');
        expect(response.data.id).toBe(fakeId);
      });

      it('should return 400 for invalid UUID format', async () => {
        const invalidId = 'invalid-uuid';

        const response = await apiClient.get(`/api/todos/${invalidId}`);

        expect(response.status).toBe(400);
        expect(response.data.message).toContain('uuid');
      });
    });

    describe('PUT /api/todos/:id - Update Todo', () => {
      it('should update todo title', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Original Title',
          description: 'Original Description',
        });
        const todoId = createResponse.data.id;

        const updates = {
          title: 'Updated Integration Test Todo',
        };

        const response = await apiClient.put(`/api/todos/${todoId}`, updates);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          id: todoId,
          title: updates.title,
          description: 'Original Description',
          completed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should update todo completion status', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Test Todo',
          description: 'Test Description',
        });
        const todoId = createResponse.data.id;

        const updates = {
          completed: true,
          completionMessage: 'Task completed successfully',
        };

        const response = await apiClient.put(`/api/todos/${todoId}`, updates);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          id: todoId,
          title: 'Test Todo',
          completed: true,
          completionMessage: 'Task completed successfully',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should update multiple fields at once', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Original Title',
          description: 'Original Description',
        });
        const todoId = createResponse.data.id;

        const updates = {
          title: 'Fully Updated Todo',
          description: 'Updated description',
          completed: false,
        };

        const response = await apiClient.put(`/api/todos/${todoId}`, updates);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          id: todoId,
          title: updates.title,
          description: updates.description,
          completed: updates.completed,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should return 404 for non-existent todo', async () => {
        const fakeId = '123e4567-e89b-12d3-a456-426614174000';
        const updates = { title: 'Updated' };

        const response = await apiClient.put(`/api/todos/${fakeId}`, updates);

        expect(response.status).toBe(404);
        expect(response.data.error).toBe('Resource not found');
        expect(response.data.message).toBe(`Todo with id ${fakeId} not found`);
        expect(response.data.resource).toBe('Todo');
        expect(response.data.id).toBe(fakeId);
      });

      it('should reject update with invalid data types', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Test Todo',
          description: 'Test Description',
        });
        const todoId = createResponse.data.id;

        const updates = {
          completed: 'not-a-boolean',
        };

        const response = await apiClient.put(`/api/todos/${todoId}`, updates);

        expect(response.status).toBe(400);
        expect(response.data.message).toContain('completed');
      });

      it('should require completion message when marking todo as completed', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Test Todo',
          description: 'Test Description',
        });
        const todoId = createResponse.data.id;

        const updates = {
          completed: true,
          // Missing completionMessage
        };

        const response = await apiClient.put(`/api/todos/${todoId}`, updates);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation error');
        expect(response.data.message).toBe('Completion message is required when marking todo as completed');
        expect(response.data.field).toBe('completionMessage');
      });

      it('should reject empty completion message when marking todo as completed', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Test Todo',
          description: 'Test Description',
        });
        const todoId = createResponse.data.id;

        const updates = {
          completed: true,
          completionMessage: '',
        };

        const response = await apiClient.put(`/api/todos/${todoId}`, updates);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation error');
        expect(response.data.message).toBe('Completion message is required when marking todo as completed');
        expect(response.data.field).toBe('completionMessage');
      });

      it('should reject whitespace-only completion message when marking todo as completed', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Test Todo',
          description: 'Test Description',
        });
        const todoId = createResponse.data.id;

        const updates = {
          completed: true,
          completionMessage: '   ',
        };

        const response = await apiClient.put(`/api/todos/${todoId}`, updates);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation error');
        expect(response.data.message).toBe('Completion message is required when marking todo as completed');
        expect(response.data.field).toBe('completionMessage');
      });

      it('should uncheck a completed todo (mark as pending)', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Test Todo',
          description: 'Test Description',
        });
        const todoId = createResponse.data.id;

        // Mark it as completed
        await apiClient.put(`/api/todos/${todoId}`, {
          completed: true,
          completionMessage: 'Task completed successfully',
        });

        // Now uncheck it (mark as pending)
        const updates = {
          completed: false,
        };

        const response = await apiClient.put(`/api/todos/${todoId}`, updates);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          id: todoId,
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
        // When unchecked, completion message should not be present
        expect(response.data.completionMessage).toBeUndefined();
      });
    });

    describe('GET /api/todos/completed - Get Completed Todos', () => {
      it('should return only completed todos', async () => {
        // Create a todo and mark it as completed
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Test Todo',
          description: 'Test Description',
        });
        const todoId = createResponse.data.id;

        // Mark it as completed
        await apiClient.put(`/api/todos/${todoId}`, {
          completed: true,
          completionMessage: 'Test completion message',
        });

        const response = await apiClient.get('/api/todos/completed');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);

        // All returned todos should be completed
        response.data.forEach((todo: TodoResponse) => {
          expect(todo.completed).toBe(true);
        });
      });
    });

    describe('GET /api/todos/pending - Get Pending Todos', () => {
      it('should return only pending todos', async () => {
        // Create a new pending todo
        const pendingTodo = await apiClient.post('/api/todos', {
          title: 'Pending Todo',
          description: 'This should be pending',
        });

        const response = await apiClient.get('/api/todos/pending');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);

        // All returned todos should be pending (not completed)
        response.data.forEach((todo: TodoResponse) => {
          expect(todo.completed).toBe(false);
        });

        // Our new todo should be in the pending list
        const foundTodo = response.data.find((todo: TodoResponse) => todo.id === pendingTodo.data.id);
        expect(foundTodo).toBeDefined();
      });
    });

    describe('PUT /api/todos/:id/delete - Delete Todo', () => {
      it('should delete a todo', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Todo to Delete',
          description: 'This will be deleted',
        });
        const todoId = createResponse.data.id;

        const response = await apiClient.put(`/api/todos/${todoId}/delete`);

        expect(response.status).toBe(204);
        expect(response.data).toBe('');
      });

      it('should return 404 when trying to get deleted todo', async () => {
        // Create a todo first
        const createResponse = await apiClient.post('/api/todos', {
          title: 'Todo to Delete',
          description: 'This will be deleted',
        });
        const todoId = createResponse.data.id;

        // Delete the todo
        await apiClient.put(`/api/todos/${todoId}/delete`);

        // Try to get the deleted todo
        const response = await apiClient.get(`/api/todos/${todoId}`);

        expect(response.status).toBe(404);
        expect(response.data.error).toBe('Resource not found');
        expect(response.data.message).toBe(`Todo with id ${todoId} not found`);
        expect(response.data.resource).toBe('Todo');
        expect(response.data.id).toBe(todoId);
      });

      it('should return 404 for non-existent todo deletion', async () => {
        const fakeId = '123e4567-e89b-12d3-a456-426614174000';

        const response = await apiClient.put(`/api/todos/${fakeId}/delete`);

        expect(response.status).toBe(404);
        expect(response.data.error).toBe('Resource not found');
        expect(response.data.message).toBe(`Todo with id ${fakeId} not found`);
        expect(response.data.resource).toBe('Todo');
        expect(response.data.id).toBe(fakeId);
      });

      it('should return 400 for invalid UUID format', async () => {
        const invalidId = 'invalid-uuid';

        const response = await apiClient.put(`/api/todos/${invalidId}/delete`);

        expect(response.status).toBe(400);
        expect(response.data.message).toContain('uuid');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await apiClient.get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        message: 'not found',
      });
    });

    it('should handle malformed JSON requests', async () => {
      const response = await apiClient.post('/api/todos', 'invalid-json', {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await apiClient.get('/health');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger UI at /api-docs', async () => {
      const response = await apiClient.get('/api-docs/');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.data).toContain('swagger-ui');
    });

    it('should serve Swagger UI resources', async () => {
      // Test that the swagger UI is properly configured
      const response = await apiClient.get('/api-docs/');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      // Check that the page contains references to our API
      expect(response.data).toContain('Todo API Documentation');
    });
  });
});
