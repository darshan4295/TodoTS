import axios from 'axios';
import { ApiTodo, CreateTodoRequest, UpdateTodoRequest } from '../types/api';

const API_BASE_URL = '/api/todos';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const todoApi = {
  // Get all todos
  getTodos: async (): Promise<ApiTodo[]> => {
    const response = await api.get<ApiTodo[]>('');
    return response.data;
  },

  // Get completed todos
  getCompletedTodos: async (): Promise<ApiTodo[]> => {
    const response = await api.get<ApiTodo[]>('/completed');
    return response.data;
  },

  // Get pending todos
  getPendingTodos: async (): Promise<ApiTodo[]> => {
    const response = await api.get<ApiTodo[]>('/pending');
    return response.data;
  },

  // Get todo by ID
  getTodoById: async (id: string): Promise<ApiTodo> => {
    const response = await api.get<ApiTodo>(`/${id}`);
    return response.data;
  },

  // Create new todo
  createTodo: async (todo: CreateTodoRequest): Promise<ApiTodo> => {
    const response = await api.post<ApiTodo>('', todo);
    return response.data;
  },

  // Update todo
  updateTodo: async (id: string, todo: UpdateTodoRequest): Promise<ApiTodo> => {
    const response = await api.put<ApiTodo>(`/${id}`, todo);
    return response.data;
  },

  // Delete todo
  deleteTodo: async (id: string): Promise<void> => {
    await api.delete(`/${id}`);
  },
};
