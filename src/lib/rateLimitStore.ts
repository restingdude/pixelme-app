// Shared rate limiting storage
// In production, use Redis or database for shared storage across multiple server instances

export interface RateLimitData {
  count: number;
  resetTime: number;
}

export const rateLimitStore = new Map<string, RateLimitData>();

export const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

export const getRateLimitStatus = (clientIP: string) => {
  cleanupExpiredEntries();
  
  const now = Date.now();
  const maxGenerations = 5;
  const clientData = rateLimitStore.get(clientIP);

  let remainingGenerations = maxGenerations;
  let timeUntilReset = 0;

  if (clientData) {
    if (now > clientData.resetTime) {
      // Reset period has passed
      remainingGenerations = maxGenerations;
      timeUntilReset = 0;
    } else {
      // Still within the hour
      remainingGenerations = Math.max(0, maxGenerations - clientData.count);
      timeUntilReset = Math.max(0, clientData.resetTime - now);
    }
  }

  return {
    remainingGenerations,
    timeUntilReset,
    maxGenerations
  };
};
