type TodoBase = {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Todo =
  | (TodoBase & {
      status: 'pending';
    })
  | (TodoBase & {
      status: 'completed';
      completionMessage: string;
    });

export type InternalUpdateTodoRequest = {
  title?: string;
  description?: string;
  status?: 'pending' | 'completed';
  completionMessage?: string;
};
