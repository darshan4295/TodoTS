import { Router } from 'express';
import { TodoController } from '../controllers/todoController';
import { TodoService } from '../services/todoService';
import { TodoRepository } from '../repositories/todoRepository';
import { Database } from '../config/database';

// Initialize dependencies - this will be called after database connection
export const createTodoRoutes = (): Router => {
  const router = Router();

  const database = Database.getInstance();
  const todoRepository = new TodoRepository(database.getDb());
  const todoService = new TodoService(todoRepository);
  const todoController = new TodoController(todoService);

  router.get('/', todoController.getAllTodos);

  router.get('/completed', todoController.getCompletedTodos);

  router.get('/pending', todoController.getPendingTodos);

  router.get('/:id', todoController.getTodoById);

  router.post('/', todoController.createTodo);

  router.put('/:id', todoController.updateTodo);

  router.put('/:id/delete', todoController.deleteTodo);

  return router;
};
