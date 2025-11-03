import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/utils';
import TodoItem from './TodoItem';
import { mockTodos } from '../test/mockData';
import * as useTodos from '../hooks/useTodos';

// Mock the useTodos hook
vi.mock('../hooks/useTodos');

// Mock window.prompt and window.confirm
Object.defineProperty(window, 'prompt', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

describe('TodoItem', () => {
  const mockUpdateMutate = vi.fn();
  const mockDeleteMutate = vi.fn();
  
  const mockUpdateTodo = {
    mutate: mockUpdateMutate,
    isPending: false,
  } as any;
  
  const mockDeleteTodo = {
    mutate: mockDeleteMutate,
    isPending: false,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTodos.useUpdateTodo).mockReturnValue(mockUpdateTodo);
    vi.mocked(useTodos.useDeleteTodo).mockReturnValue(mockDeleteTodo);
    vi.mocked(window.prompt).mockReturnValue('Test completion message');
    vi.mocked(window.confirm).mockReturnValue(true);
  });

  it('renders todo item correctly', () => {
    const todo = mockTodos[0]; // Pending todo
    render(<TodoItem todo={todo} />);
    
    expect(screen.getByText(todo.title)).toBeInTheDocument();
    expect(screen.getByText(todo.description!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });

  it('renders completed todo with completion message', () => {
    const todo = mockTodos[1]; // Completed todo
    render(<TodoItem todo={todo} />);
    
    expect(screen.getByText(todo.title)).toBeInTheDocument();
    expect(screen.getByText(todo.completionMessage!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument();
  });

  it('toggles todo completion status when complete button is clicked', async () => {
    const user = userEvent.setup();
    const todo = mockTodos[0]; // Pending todo
    render(<TodoItem todo={todo} />);
    
    const completeButton = screen.getByRole('button', { name: /complete/i });
    await user.click(completeButton);
    
    expect(window.prompt).toHaveBeenCalledWith('Enter completion message (optional):');
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: todo.id,
      todo: {
        completed: true,
        completionMessage: 'Test completion message',
      },
    });
  });

  it('toggles completed todo back to pending', async () => {
    const user = userEvent.setup();
    const todo = mockTodos[1]; // Completed todo
    render(<TodoItem todo={todo} />);
    
    const reopenButton = screen.getByRole('button', { name: /reopen/i });
    await user.click(reopenButton);
    
    expect(window.prompt).not.toHaveBeenCalled();
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: todo.id,
      todo: {
        completed: false,
        completionMessage: undefined,
      },
    });
  });

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    const todo = mockTodos[0];
    render(<TodoItem todo={todo} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    expect(screen.getByDisplayValue(todo.title)).toBeInTheDocument();
    expect(screen.getByDisplayValue(todo.description!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('saves edited todo', async () => {
    const user = userEvent.setup();
    const todo = mockTodos[0];
    mockUpdateMutate.mockImplementation((_data, options) => {
      if (options && options.onSuccess) {
        options.onSuccess();
      }
    });
    
    render(<TodoItem todo={todo} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    const titleInput = screen.getByDisplayValue(todo.title);
    const descriptionInput = screen.getByDisplayValue(todo.description!);
    
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated Description');
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        id: todo.id,
        todo: {
          title: 'Updated Title',
          description: 'Updated Description',
        },
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );
  });

  it('cancels edit mode', async () => {
    const user = userEvent.setup();
    const todo = mockTodos[0];
    render(<TodoItem todo={todo} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    const titleInput = screen.getByDisplayValue(todo.title);
    await user.clear(titleInput);
    await user.type(titleInput, 'Changed Title');
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(screen.getByText(todo.title)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Changed Title')).not.toBeInTheDocument();
  });

  it('deletes todo when delete button is clicked', async () => {
    const user = userEvent.setup();
    const todo = mockTodos[0];
    vi.mocked(window.confirm).mockReturnValue(true);
    render(<TodoItem todo={todo} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this todo?');
    expect(mockDeleteMutate).toHaveBeenCalledWith(todo.id);
  });

  it('does not delete todo when user cancels confirmation', async () => {
    const user = userEvent.setup();
    const todo = mockTodos[0];
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<TodoItem todo={todo} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this todo?');
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it('does not save edit if title is empty', async () => {
    const user = userEvent.setup();
    const todo = mockTodos[0];
    render(<TodoItem todo={todo} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    const titleInput = screen.getByDisplayValue(todo.title);
    await user.clear(titleInput);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it('handles empty completion message', async () => {
    const user = userEvent.setup();
    vi.mocked(window.prompt).mockReturnValue('');
    const todo = mockTodos[0];
    render(<TodoItem todo={todo} />);
    
    const completeButton = screen.getByRole('button', { name: /complete/i });
    await user.click(completeButton);
    
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: todo.id,
      todo: {
        completed: true,
        completionMessage: undefined,
      },
    });
  });

  it('handles cancelled completion message prompt', async () => {
    const user = userEvent.setup();
    vi.mocked(window.prompt).mockReturnValue(null);
    const todo = mockTodos[0];
    render(<TodoItem todo={todo} />);
    
    const completeButton = screen.getByRole('button', { name: /complete/i });
    await user.click(completeButton);
    
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: todo.id,
      todo: {
        completed: true,
        completionMessage: undefined,
      },
    });
  });
});
