import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './test/utils';
import App from './App';

// Mock the child components
vi.mock('./components/TodoForm', () => ({
  default: () => <div data-testid="todo-form">TodoForm</div>
}));

vi.mock('./components/TodoFilter', () => ({
  default: ({ currentFilter, onFilterChange }: any) => (
    <div data-testid="todo-filter">
      <span>Current: {currentFilter}</span>
      <button onClick={() => onFilterChange('completed')}>Set Completed</button>
    </div>
  )
}));

vi.mock('./components/TodoList', () => ({
  default: ({ filter }: any) => (
    <div data-testid="todo-list">TodoList - Filter: {filter}</div>
  )
}));

describe('App', () => {
  it('renders the main app structure', () => {
    render(<App />);
    
    expect(screen.getByText('Todo App')).toBeInTheDocument();
    expect(screen.getByTestId('todo-form')).toBeInTheDocument();
    expect(screen.getByTestId('todo-filter')).toBeInTheDocument();
    expect(screen.getByTestId('todo-list')).toBeInTheDocument();
  });

  it('renders header with correct title', () => {
    render(<App />);
    
    const header = screen.getByRole('heading', { name: 'Todo App' });
    expect(header).toBeInTheDocument();
  });

  it('initializes with "all" filter', () => {
    render(<App />);
    
    expect(screen.getByText('Current: all')).toBeInTheDocument();
    expect(screen.getByText('TodoList - Filter: all')).toBeInTheDocument();
  });

  it('updates filter when TodoFilter changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const setCompletedButton = screen.getByText('Set Completed');
    await user.click(setCompletedButton);
    
    expect(screen.getByText('Current: completed')).toBeInTheDocument();
    expect(screen.getByText('TodoList - Filter: completed')).toBeInTheDocument();
  });

  it('has correct app structure with classes', () => {
    render(<App />);
    
    const appDiv = screen.getByText('Todo App').closest('.app');
    const headerDiv = screen.getByText('Todo App').closest('.app-header');
    const mainDiv = screen.getByTestId('todo-form').closest('.app-main');
    const containerDiv = screen.getByTestId('todo-form').closest('.todo-container');
    
    expect(appDiv).toBeInTheDocument();
    expect(headerDiv).toBeInTheDocument();
    expect(mainDiv).toBeInTheDocument();
    expect(containerDiv).toBeInTheDocument();
  });
});
