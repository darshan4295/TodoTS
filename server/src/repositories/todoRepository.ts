import { Collection, Db } from 'mongodb';
import { Result, ok, err } from 'neverthrow';
import { randomUUID } from 'crypto';
import { Todo, InternalUpdateTodoRequest } from '../types/todo';
import { CreateTodoRequest } from '../../../client/src/types/api';
import { AppError, createDatabaseError, createNotFoundError } from '../types/errors';

// Common base type for all todo documents
type TodoDocumentBase = {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

type TodoDocument =
  | (TodoDocumentBase & {
      status: 'pending';
    })
  | (TodoDocumentBase & {
      status: 'completed';
      completionMessage: string;
    })
  | (TodoDocumentBase & {
      status: 'deleted';
    });

export class TodoRepository {
  private collection: Collection<TodoDocument>;

  constructor(db: Db) {
    this.collection = db.collection<TodoDocument>('todos');
  }

  private documentToTodo(doc: TodoDocument): Todo {
    const baseTodo = {
      id: doc.id,
      title: doc.title,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    if (doc.status === 'completed') {
      const todo: Todo = {
        ...baseTodo,
        status: 'completed',
        completionMessage: doc.completionMessage,
      };
      if (doc.description !== undefined) {
        todo.description = doc.description;
      }
      return todo;
    } else {
      const todo: Todo = {
        ...baseTodo,
        status: 'pending',
      };
      if (doc.description !== undefined) {
        todo.description = doc.description;
      }
      return todo;
    }
  }

  private getBaseFilter() {
    return { status: { $ne: 'deleted' as const } };
  }

  async findAll(): Promise<Result<Todo[], AppError>> {
    try {
      const docs = await this.collection.find(this.getBaseFilter()).sort({ createdAt: -1 }).toArray();
      return ok(docs.map((doc) => this.documentToTodo(doc)));
    } catch (error) {
      return err(createDatabaseError('Failed to retrieve todos', error));
    }
  }

  async findById(id: string): Promise<Result<Todo, AppError>> {
    try {
      const doc = await this.collection.findOne({ ...this.getBaseFilter(), id });
      if (!doc) {
        return err(createNotFoundError('Todo', id));
      }
      return ok(this.documentToTodo(doc));
    } catch (error) {
      return err(createDatabaseError('Failed to retrieve todo by id', error));
    }
  }

  async create(todoData: CreateTodoRequest): Promise<Result<Todo, AppError>> {
    try {
      const now = new Date();

      const todoDocument: TodoDocument = {
        schemaVersion: 1,
        id: randomUUID(),
        title: todoData.title,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      if (todoData.description !== undefined) {
        todoDocument.description = todoData.description;
      }

      await this.collection.insertOne(todoDocument);
      return ok(this.documentToTodo(todoDocument));
    } catch (error) {
      return err(createDatabaseError('Failed to create todo', error));
    }
  }

  async update(id: string, updates: InternalUpdateTodoRequest): Promise<Result<Todo, AppError>> {
    try {
      const updateDoc: any = {
        updatedAt: new Date(),
      };

      if (updates.title !== undefined) {
        updateDoc.title = updates.title;
      }
      if (updates.description !== undefined) {
        updateDoc.description = updates.description;
      }
      if (updates.status !== undefined) {
        updateDoc.status = updates.status;
        if (updates.status === 'completed' && updates.completionMessage !== undefined) {
          updateDoc.completionMessage = updates.completionMessage;
        }
      }

      // Handle the case where we're changing from completed to pending
      const updateQuery: any = { $set: updateDoc };
      if (updates.status === 'pending') {
        updateQuery.$unset = { completionMessage: '' };
      }

      const result = await this.collection.findOneAndUpdate({ ...this.getBaseFilter(), id }, updateQuery, {
        returnDocument: 'after',
      });

      if (!result) {
        return err(createNotFoundError('Todo', id));
      }

      return ok(this.documentToTodo(result));
    } catch (error) {
      return err(createDatabaseError('Failed to update todo', error));
    }
  }

  async delete(id: string): Promise<Result<boolean, AppError>> {
    try {
      const result = await this.collection.findOneAndUpdate(
        { ...this.getBaseFilter(), id },
        { $set: { status: 'deleted' as const, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );
      if (!result) {
        return err(createNotFoundError('Todo', id));
      }
      return ok(true);
    } catch (error) {
      return err(createDatabaseError('Failed to delete todo', error));
    }
  }
}
