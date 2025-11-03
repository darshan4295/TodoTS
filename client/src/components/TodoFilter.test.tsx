import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/utils';
import TodoFilter from './TodoFilter';
import { FilterType } from '../types/api';

describe('TodoFilter', () => {
  const mockOnFilterChange = vi.fn();

  const defaultProps = {
    currentFilter: 'all' as FilterType,
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter buttons', () => {
    render(<TodoFilter {...defaultProps} />);
    
    expect(screen.getByText('Filter:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument();
  });

  it('highlights the current filter button', () => {
    render(<TodoFilter {...defaultProps} currentFilter="pending" />);
    
    const allButton = screen.getByRole('button', { name: 'All' });
    const pendingButton = screen.getByRole('button', { name: 'Pending' });
    const completedButton = screen.getByRole('button', { name: 'Completed' });
    
    expect(allButton).not.toHaveClass('active');
    expect(pendingButton).toHaveClass('active');
    expect(completedButton).not.toHaveClass('active');
  });

  it('calls onFilterChange when a filter button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoFilter {...defaultProps} />);
    
    const pendingButton = screen.getByRole('button', { name: 'Pending' });
    
    await user.click(pendingButton);
    
    expect(mockOnFilterChange).toHaveBeenCalledWith('pending');
  });

  it('calls onFilterChange with correct filter value for each button', async () => {
    const user = userEvent.setup();
    render(<TodoFilter {...defaultProps} />);
    
    const allButton = screen.getByRole('button', { name: 'All' });
    const pendingButton = screen.getByRole('button', { name: 'Pending' });
    const completedButton = screen.getByRole('button', { name: 'Completed' });
    
    await user.click(allButton);
    expect(mockOnFilterChange).toHaveBeenCalledWith('all');
    
    await user.click(pendingButton);
    expect(mockOnFilterChange).toHaveBeenCalledWith('pending');
    
    await user.click(completedButton);
    expect(mockOnFilterChange).toHaveBeenCalledWith('completed');
  });

  it('applies active class only to current filter', () => {
    const { rerender } = render(<TodoFilter {...defaultProps} currentFilter="all" />);
    
    expect(screen.getByRole('button', { name: 'All' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Pending' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Completed' })).not.toHaveClass('active');
    
    rerender(<TodoFilter {...defaultProps} currentFilter="completed" />);
    
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Pending' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Completed' })).toHaveClass('active');
  });
});
