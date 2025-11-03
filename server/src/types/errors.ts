export type DatabaseError = {
  type: 'DATABASE_ERROR';
  message: string;
  originalError?: unknown;
};

export type NotFoundError = {
  type: 'NOT_FOUND';
  message: string;
  resource: string;
  id: string;
};

export type ValidationError = {
  type: 'VALIDATION_ERROR';
  message: string;
  field?: string;
};

export type AppError = DatabaseError | NotFoundError | ValidationError;

export const createDatabaseError = (message: string, originalError?: unknown): DatabaseError => ({
  type: 'DATABASE_ERROR',
  message,
  originalError,
});

export const createNotFoundError = (resource: string, id: string): NotFoundError => ({
  type: 'NOT_FOUND',
  message: `${resource} with id ${id} not found`,
  resource,
  id,
});

export const createValidationError = (message: string, field?: string): ValidationError => {
  const error: ValidationError = {
    type: 'VALIDATION_ERROR',
    message,
  };

  if (field !== undefined) {
    error.field = field;
  }

  return error;
};
