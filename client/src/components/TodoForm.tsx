import { useState } from 'react';
import { useCreateTodo } from '../hooks/useTodos';

const TodoForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const createTodoMutation = useCreateTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    createTodoMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="todo-form">
      <div className="form-group">
        <input
          type="text"
          placeholder="Enter todo title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="form-input"
          maxLength={255}
          required
        />
      </div>
      
      <div className="form-group">
        <textarea
          placeholder="Enter description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="form-textarea"
          maxLength={1000}
          rows={3}
        />
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary"
        disabled={createTodoMutation.isPending || !title.trim()}
      >
        {createTodoMutation.isPending ? 'Adding...' : 'Add Todo'}
      </button>
      
      {createTodoMutation.isError && (
        <div className="error-message">
          Failed to create todo. Please try again.
        </div>
      )}
    </form>
  );
};

export default TodoForm;
