/**
 * Utility function for implementing retry logic with exponential backoff
 * @param operation The function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds before retrying (will be multiplied by attempt)
 * @param maxDelay Maximum delay in milliseconds
 * @returns Result of the operation
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error = new Error("Operation failed after multiple retries");
  
  for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt >= maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
