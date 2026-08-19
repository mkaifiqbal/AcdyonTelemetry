export const retryDelay = (attempt, baseMs = 1000) => {
  const exponential = baseMs * (2 ** Math.max(0, attempt - 1));
  return Math.min(exponential, 16000) + Math.floor(Math.random() * 500);
};
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
