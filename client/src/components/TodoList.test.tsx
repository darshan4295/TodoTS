import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test/utils';
import TodoList from './TodoList';
import { mockTodos, mockCompletedTodos, mockPendingTodos } from '../test/mockData';
import * as useTodos from '../hooks/useTodos';

// Mock the hooks and components
vi.mock('../hooks/useTodos');
vi.mock('./TodoItem', () => ({
  default: ({ todo }: any) => (
    <div data-testid={`todo-item-${todo.id}`}>
      {todo.title}
    </div>
  )
}));

describe('TodoList', () => {
  const mockUseTodos = vi.mocked(useTodos.useTodos);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseTodos.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="all" />);
    
    expect(screen.getByText('Loading todos...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorMessage = 'Failed to fetch todos';
    mockUseTodos.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error(errorMessage),
    } as any);

    render(<TodoList filter="all" />);
    
    expect(screen.getByText(`Failed to load todos: ${errorMessage}`)).toBeInTheDocument();
  });

  it('renders error state with unknown error', () => {
    mockUseTodos.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: null,
    } as any);

    render(<TodoList filter="all" />);
    
    expect(screen.getByText('Failed to load todos: Unknown error')).toBeInTheDocument();
  });

  it('renders empty state for all todos', () => {
    mockUseTodos.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="all" />);
    
    expect(screen.getByText('No todos yet. Create your first todo!')).toBeInTheDocument();
  });

  it('renders empty state for completed todos', () => {
    mockUseTodos.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="completed" />);
    
    expect(screen.getByText('No completed todos.')).toBeInTheDocument();
  });

  it('renders empty state for pending todos', () => {
    mockUseTodos.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="pending" />);
    
    expect(screen.getByText('No pending todos.')).toBeInTheDocument();
  });

  it('renders list of todos', () => {
    mockUseTodos.mockReturnValue({
      data: mockTodos,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="all" />);
    
    expect(screen.getByText('3 todos')).toBeInTheDocument();
    expect(screen.getByTestId('todo-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('todo-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('todo-item-3')).toBeInTheDocument();
    expect(screen.getByText('Learn React')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('Deploy app')).toBeInTheDocument();
  });

  it('renders single todo with singular count', () => {
    mockUseTodos.mockReturnValue({
      data: [mockTodos[0]],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="all" />);
    
    expect(screen.getByText('1 todo')).toBeInTheDocument();
    expect(screen.getByTestId('todo-item-1')).toBeInTheDocument();
  });

  it('renders completed todos with filter label', () => {
    mockUseTodos.mockReturnValue({
      data: mockCompletedTodos,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="completed" />);
    
    expect(screen.getByText('1 todo (completed)')).toBeInTheDocument();
    expect(screen.getByTestId('todo-item-2')).toBeInTheDocument();
  });

  it('renders pending todos with filter label', () => {
    mockUseTodos.mockReturnValue({
      data: mockPendingTodos,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="pending" />);
    
    expect(screen.getByText('2 todos (pending)')).toBeInTheDocument();
    expect(screen.getByTestId('todo-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('todo-item-3')).toBeInTheDocument();
  });

  it('calls useTodos with correct filter', () => {
    mockUseTodos.mockReturnValue({
      data: mockTodos,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="completed" />);
    
    expect(mockUseTodos).toHaveBeenCalledWith('completed');
  });

  it('handles undefined todos data', () => {
    mockUseTodos.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TodoList filter="all" />);
    
    expect(screen.getByText('No todos yet. Create your first todo!')).toBeInTheDocument();
  });
});
