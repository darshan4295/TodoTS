import { ApiTodo } from '../types/api';

export const mockTodos: ApiTodo[] = [
  {
    id: '1',
    title: 'Learn React',
    description: 'Study React hooks and components',
    completed: false,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: '2',
    title: 'Write tests',
    description: 'Add unit tests for components',
    completed: true,
    completionMessage: 'All tests passing!',
    createdAt: new Date('2024-01-01T11:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
  },
  {
    id: '3',
    title: 'Deploy app',
    description: 'Deploy to production',
    completed: false,
    createdAt: new Date('2024-01-01T13:00:00Z'),
    updatedAt: new Date('2024-01-01T13:00:00Z'),
  },
];

export const mockCompletedTodos = mockTodos.filter(todo => todo.completed);
export const mockPendingTodos = mockTodos.filter(todo => !todo.completed);
