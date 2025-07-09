/**
 * Utility function to retry an operation with exponential backoff
 * @param operation Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelay Initial delay in milliseconds
 * @returns Result of the operation
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        // Increase delay for next attempt (exponential backoff with jitter)
        delay = delay * 2 * (0.8 + Math.random() * 0.4);
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}
