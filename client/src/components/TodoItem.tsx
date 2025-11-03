import { useState } from 'react';
import { useUpdateTodo, useDeleteTodo } from '../hooks/useTodos';
import { ApiTodo } from '../types/api';

interface TodoItemProps {
  todo: ApiTodo;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');

  const updateTodoMutation = useUpdateTodo();
  const deleteTodoMutation = useDeleteTodo();

  const handleToggleComplete = () => {
    if (!todo.completed) {
      // If marking as complete, prompt for completion message
      const message = prompt('Enter completion message (optional):');
      updateTodoMutation.mutate({
        id: todo.id,
        todo: {
          completed: !todo.completed,
          completionMessage: message || undefined,
        },
      });
    } else {
      updateTodoMutation.mutate({
        id: todo.id,
        todo: {
          completed: !todo.completed,
          completionMessage: undefined,
        },
      });
    }
  };

  const handleSaveEdit = () => {
    updateTodoMutation.mutate(
      {
        id: todo.id,
        todo: {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      deleteTodoMutation.mutate(todo.id);
    }
  };

  if (isEditing) {
    return (
      <div className="todo-item editing">
        <div className="todo-edit-form">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="edit-input"
            maxLength={255}
            required
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="edit-textarea"
            placeholder="Description (optional)"
            maxLength={1000}
            rows={2}
          />
          <div className="edit-actions">
            <button
              onClick={handleSaveEdit}
              className="btn btn-save"
              disabled={updateTodoMutation.isPending || !editTitle.trim()}
            >
              {updateTodoMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="btn btn-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`todo-item ${todo.completed ? 'completed' : 'pending'}`}>
      <div className="todo-content">
        <div className="todo-header">
          <h3 className="todo-title">{todo.title}</h3>
          <div className="todo-actions">
            <button
              onClick={handleToggleComplete}
              className={`btn btn-toggle ${todo.completed ? 'btn-uncomplete' : 'btn-complete'}`}
              disabled={updateTodoMutation.isPending}
            >
              {updateTodoMutation.isPending 
                ? '...' 
                : todo.completed 
                  ? '↶ Reopen' 
                  : '✓ Complete'
              }
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-edit"
            >
              ✎ Edit
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-delete"
              disabled={deleteTodoMutation.isPending}
            >
              {deleteTodoMutation.isPending ? '...' : '🗑 Delete'}
            </button>
          </div>
        </div>

        {todo.description && (
          <p className="todo-description">{todo.description}</p>
        )}

        {todo.completed && todo.completionMessage && (
          <div className="completion-message">
            <strong>Completion note:</strong> {todo.completionMessage}
          </div>
        )}

        <div className="todo-meta">
          <span className="todo-status">
            Status: {todo.completed ? 'Completed' : 'Pending'}
          </span>
          <span className="todo-dates">
            Created: {new Date(todo.createdAt).toLocaleDateString()}
            {todo.updatedAt !== todo.createdAt && (
              <span> • Updated: {new Date(todo.updatedAt).toLocaleDateString()}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TodoItem;
