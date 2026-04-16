export type ApiTodo = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completionMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTodoRequest = {
  title: string;
  description?: string;
};

export type UpdateTodoRequest = {
  title?: string;
  description?: string;
  completed?: boolean;
  completionMessage?: string;
};

export type FilterType = 'all' | 'completed' | 'pending';
