import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/utils';
import TodoForm from './TodoForm';
import * as useTodos from '../hooks/useTodos';

// Mock the useTodos hook
vi.mock('../hooks/useTodos');

describe('TodoForm', () => {
  const mockMutate = vi.fn();
  const mockCreateTodo = {
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTodos.useCreateTodo).mockReturnValue(mockCreateTodo);
  });

  it('renders form elements correctly', () => {
    render(<TodoForm />);
    
    expect(screen.getByPlaceholderText('Enter todo title...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter description (optional)...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add todo/i })).toBeInTheDocument();
  });

  it('updates input values when user types', async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    
    const titleInput = screen.getByPlaceholderText('Enter todo title...');
    const descriptionInput = screen.getByPlaceholderText('Enter description (optional)...');
    
    await user.type(titleInput, 'Test Todo');
    await user.type(descriptionInput, 'Test Description');
    
    expect(titleInput).toHaveValue('Test Todo');
    expect(descriptionInput).toHaveValue('Test Description');
  });

  it('submits form with title and description', async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    
    const titleInput = screen.getByPlaceholderText('Enter todo title...');
    const descriptionInput = screen.getByPlaceholderText('Enter description (optional)...');
    const submitButton = screen.getByRole('button', { name: /add todo/i });
    
    await user.type(titleInput, 'Test Todo');
    await user.type(descriptionInput, 'Test Description');
    await user.click(submitButton);
    
    expect(mockMutate).toHaveBeenCalledWith(
      {
        title: 'Test Todo',
        description: 'Test Description',
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );
  });

  it('submits form with only title when description is empty', async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    
    const titleInput = screen.getByPlaceholderText('Enter todo title...');
    const submitButton = screen.getByRole('button', { name: /add todo/i });
    
    await user.type(titleInput, 'Test Todo');
    await user.click(submitButton);
    
    expect(mockMutate).toHaveBeenCalledWith(
      {
        title: 'Test Todo',
        description: undefined,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );
  });

  it('does not submit when title is empty', async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    
    const submitButton = screen.getByRole('button', { name: /add todo/i });
    
    await user.click(submitButton);
    
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not submit when title contains only whitespace', async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    
    const titleInput = screen.getByPlaceholderText('Enter todo title...');
    const submitButton = screen.getByRole('button', { name: /add todo/i });
    
    await user.type(titleInput, '   ');
    await user.click(submitButton);
    
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();
    mockMutate.mockImplementation((_data, { onSuccess }) => {
      onSuccess();
    });
    
    render(<TodoForm />);
    
    const titleInput = screen.getByPlaceholderText('Enter todo title...');
    const descriptionInput = screen.getByPlaceholderText('Enter description (optional)...');
    const submitButton = screen.getByRole('button', { name: /add todo/i });
    
    await user.type(titleInput, 'Test Todo');
    await user.type(descriptionInput, 'Test Description');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(titleInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
    });
  });

  it('trims whitespace from inputs before submission', async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    
    const titleInput = screen.getByPlaceholderText('Enter todo title...');
    const descriptionInput = screen.getByPlaceholderText('Enter description (optional)...');
    const submitButton = screen.getByRole('button', { name: /add todo/i });
    
    await user.type(titleInput, '  Test Todo  ');
    await user.type(descriptionInput, '  Test Description  ');
    await user.click(submitButton);
    
    expect(mockMutate).toHaveBeenCalledWith(
      {
        title: 'Test Todo',
        description: 'Test Description',
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );
  });

  it('prevents form submission with Enter key when title is empty', async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    
    const titleInput = screen.getByPlaceholderText('Enter todo title...');
    
    await user.type(titleInput, '{enter}');
    
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
