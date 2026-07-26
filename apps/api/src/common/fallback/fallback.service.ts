import { Injectable, Logger } from '@nestjs/common';

/**
 * Fallback Service
 * Provides fallback mechanisms for critical services when they fail
 */
@Injectable()
export class FallbackService {
  private readonly logger = new Logger(FallbackService.name);

  /**
   * Fallback for database operations
   * Returns cached data or default values when database is unavailable
   */
  databaseFallback<T>(defaultValue: T, cachedData?: T): T {
    this.logger.warn('Using database fallback');
    return cachedData ?? defaultValue;
  }

  /**
   * Fallback for Redis/cache operations
   * Returns default values when cache is unavailable
   */
  cacheFallback<T>(defaultValue: T): T {
    this.logger.warn('Using cache fallback');
    return defaultValue;
  }

  /**
   * Fallback for external API calls
   * Returns cached responses or default values
   */
  apiFallback<T>(defaultValue: T, cachedResponse?: T): T {
    this.logger.warn('Using API fallback');
    return cachedResponse ?? defaultValue;
  }

  /**
   * Fallback for SMS service
   * Logs the failure and returns a message indicating SMS couldn't be sent
   */
  smsFallback(phone: string, message: string): { success: boolean; message: string } {
    this.logger.error(`SMS service failed for phone: ${phone}`);
    return {
      success: false,
      message: 'سرویس پیامک در حال حاضر در دسترس نیست. لطفاً بعداً امتحان کنید.',
    };
  }

  /**
   * Fallback for authentication service
   * Returns a user object with limited permissions
   */
  authFallback(userId: number): { id: number; role: string; permissions: string[] } {
    this.logger.warn(`Using auth fallback for user: ${userId}`);
    return {
      id: userId,
      role: 'guest',
      permissions: ['read:public'],
    };
  }

  /**
   * Fallback for file upload service
   * Returns error information
   */
  uploadFallback(fileName: string): { success: boolean; error: string; fileName: string } {
    this.logger.error(`File upload failed for: ${fileName}`);
    return {
      success: false,
      error: 'سرویس آپلود فایل در حال حاضر در دسترس نیست.',
      fileName,
    };
  }

  /**
   * Fallback for search service
   * Returns empty results with a message
   */
  searchFallback<T>(query: string): { results: T[]; message: string; query: string } {
    this.logger.warn(`Search fallback for query: ${query}`);
    return {
      results: [],
      message: 'جستجو در حال حاضر با محدودیت انجام می‌شود.',
      query,
    };
  }

  /**
   * Generic fallback that can be customized
   * @param fallbackData Data to return as fallback
   * @param context Context information for logging
   */
  genericFallback<T>(fallbackData: T, context: string): T {
    this.logger.warn(`Using generic fallback: ${context}`);
    return fallbackData;
  }

  /**
   * Create a deferred fallback that will be used after a delay
   * @param operation Original operation to try
   * @param fallbackValue Fallback value to use if operation fails
   * @param delay Delay in milliseconds before using fallback
   */
  async deferredFallback<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    delay: number = 5000,
  ): Promise<T> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, delay);
      });

      const result = await Promise.race([
        operation(),
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      this.logger.warn(`Deferred fallback triggered after ${delay}ms: ${error}`);
      return fallbackValue;
    }
  }

  /**
   * Create a retryable operation with fallback
   * @param operation Operation to retry
   * @param maxRetries Maximum number of retries
   * @param delay Delay between retries in milliseconds
   * @param fallbackValue Fallback value if all retries fail
   */
  async retryWithFallback<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    fallbackValue: T,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt + 1} failed: ${error}`);

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(`All ${maxRetries} retries failed, using fallback: ${lastError}`);
    return fallbackValue;
  }
}
