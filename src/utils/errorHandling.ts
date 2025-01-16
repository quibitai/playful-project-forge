export class ChatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatError';
  }
}

export const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const logError = (error: unknown, context?: string) => {
  console.error(`[${context || 'ERROR'}]:`, error);
};