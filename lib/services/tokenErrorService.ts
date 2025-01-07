// lib/services/tokenErrorService.ts
interface RetryConfig {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
  }
  
  export async function retryRequest<T>(
    requestFn: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = 2 } = config;
    let lastError: Error | null = null;
  
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxAttempts) break;
  
        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(backoff, attempt - 1))
        );
      }
    }
  
    throw lastError;
  }
  
  export function handleError(error: any): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.message) {
      return error.message;
    }
  
    return 'An unexpected error occurred';
  }
  
  export function showErrorToUser(error: string) {
    // You can customize this based on your UI needs
    window.Telegram.WebApp.showPopup({
      title: 'Error',
      message: error,
      buttons: [{ type: 'close' }]
    });
  }