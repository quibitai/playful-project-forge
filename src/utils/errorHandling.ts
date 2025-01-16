/**
 * Custom error class for chat-related errors
 */
export class ChatError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ChatError';
  }
}

/**
 * Utility function to handle errors consistently across the application
 * @param error The error to be handled
 * @returns A standardized error object
 */
export const handleError = (error: unknown): ChatError => {
  if (error instanceof ChatError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ChatError(error.message);
  }
  
  return new ChatError('An unexpected error occurred');
};

/**
 * Utility function to log errors consistently
 * @param error The error to be logged
 * @param context Additional context for the error
 */
export const logError = (error: unknown, context?: string) => {
  const formattedError = handleError(error);
  console.error(`[${context || 'ERROR'}]:`, {
    name: formattedError.name,
    message: formattedError.message,
    code: formattedError.code,
    stack: formattedError.stack,
  });
};