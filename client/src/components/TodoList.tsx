import React from 'react';
import { useTodos } from '../hooks/useTodos';
import { FilterType } from '../types/api';
import TodoItem from './TodoItem';

interface TodoListProps {
  filter: FilterType;
}

const TodoList: React.FC<TodoListProps> = ({ filter }) => {
  const { data: todos, isLoading, isError, error } = useTodos(filter);

  if (isLoading) {
    return (
      <div className="todo-list">
        <div className="loading">Loading todos...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="todo-list">
        <div className="error-message">
          Failed to load todos: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!todos || todos.length === 0) {
    return (
      <div className="todo-list">
        <div className="empty-state">
          {filter === 'all' ? 'No todos yet. Create your first todo!' :
           filter === 'completed' ? 'No completed todos.' :
           'No pending todos.'}
        </div>
      </div>
    );
  }

  return (
    <div className="todo-list">
      <div className="todo-count">
        {todos.length} {todos.length === 1 ? 'todo' : 'todos'}
        {filter !== 'all' && ` (${filter})`}
      </div>
      <div className="todos">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </div>
    </div>
  );
};

export default TodoList;
