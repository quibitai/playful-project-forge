/**
 * Service for handling application logging
 */
export class LoggingService {
  private static instance: LoggingService;
  private isDebugEnabled: boolean;

  private constructor() {
    this.isDebugEnabled = import.meta.env.MODE === 'development';
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Log debug information in development mode
   */
  public debug(...args: unknown[]): void {
    if (this.isDebugEnabled) {
      console.debug('[DEBUG]:', ...args);
    }
  }

  /**
   * Log informational messages
   */
  public info(...args: unknown[]): void {
    console.info('[INFO]:', ...args);
  }

  /**
   * Log warnings
   */
  public warn(...args: unknown[]): void {
    console.warn('[WARN]:', ...args);
  }

  /**
   * Log errors with stack traces in development
   */
  public error(error: unknown, context?: string): void {
    if (error instanceof Error) {
      console.error(`[ERROR${context ? ` - ${context}` : ''}]:`, {
        message: error.message,
        stack: this.isDebugEnabled ? error.stack : undefined,
      });
    } else {
      console.error(`[ERROR${context ? ` - ${context}` : ''}]:`, error);
    }
  }
}

export const logger = LoggingService.getInstance();