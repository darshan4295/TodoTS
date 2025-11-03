import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodos, useTodo, useCreateTodo, useUpdateTodo, useDeleteTodo } from './useTodos';
import { todoApi } from '../api/todoApi';
import { mockTodos } from '../test/mockData';
import { ReactNode } from 'react';

// Mock the API
vi.mock('../api/todoApi');
const mockedTodoApi = vi.mocked(todoApi);

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return Wrapper;
};

describe('useTodos hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useTodos', () => {
    it('fetches all todos by default', async () => {
      mockedTodoApi.getTodos.mockResolvedValue(mockTodos);

      const { result } = renderHook(() => useTodos(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedTodoApi.getTodos).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockTodos);
    });

    it('fetches completed todos when filter is "completed"', async () => {
      const completedTodos = mockTodos.filter(t => t.completed);
      mockedTodoApi.getCompletedTodos.mockResolvedValue(completedTodos);

      const { result } = renderHook(() => useTodos('completed'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedTodoApi.getCompletedTodos).toHaveBeenCalled();
      expect(result.current.data).toEqual(completedTodos);
    });

    it('fetches pending todos when filter is "pending"', async () => {
      const pendingTodos = mockTodos.filter(t => !t.completed);
      mockedTodoApi.getPendingTodos.mockResolvedValue(pendingTodos);

      const { result } = renderHook(() => useTodos('pending'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedTodoApi.getPendingTodos).toHaveBeenCalled();
      expect(result.current.data).toEqual(pendingTodos);
    });

    it('handles API error', async () => {
      mockedTodoApi.getTodos.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useTodos(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('API Error'));
    });
  });

  describe('useTodo', () => {
    it('fetches single todo by id', async () => {
      const todo = mockTodos[0];
      mockedTodoApi.getTodoById.mockResolvedValue(todo);

      const { result } = renderHook(() => useTodo(todo.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedTodoApi.getTodoById).toHaveBeenCalledWith(todo.id);
      expect(result.current.data).toEqual(todo);
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useTodo(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedTodoApi.getTodoById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateTodo', () => {
    it('creates todo successfully', async () => {
      const newTodo = mockTodos[0];
      mockedTodoApi.createTodo.mockResolvedValue(newTodo);

      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createWrapper(),
      });

      const createData = {
        title: 'New Todo',
        description: 'Description',
      };

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedTodoApi.createTodo).toHaveBeenCalledWith(createData);
      expect(result.current.data).toEqual(newTodo);
    });

    it('handles create error', async () => {
      mockedTodoApi.createTodo.mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: 'New Todo',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Create failed'));
    });
  });

  describe('useUpdateTodo', () => {
    it('updates todo successfully', async () => {
      const updatedTodo = { ...mockTodos[0], title: 'Updated Title' };
      mockedTodoApi.updateTodo.mockResolvedValue(updatedTodo);

      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        id: mockTodos[0].id,
        todo: { title: 'Updated Title' },
      };

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedTodoApi.updateTodo).toHaveBeenCalledWith(
        updateData.id,
        updateData.todo
      );
      expect(result.current.data).toEqual(updatedTodo);
    });
  });

  describe('useDeleteTodo', () => {
    it('deletes todo successfully', async () => {
      mockedTodoApi.deleteTodo.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTodo(), {
        wrapper: createWrapper(),
      });

      const todoId = mockTodos[0].id;
      result.current.mutate(todoId);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedTodoApi.deleteTodo).toHaveBeenCalledWith(todoId);
    });

    it('handles delete error', async () => {
      mockedTodoApi.deleteTodo.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteTodo(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockTodos[0].id);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Delete failed'));
    });
  });
});
