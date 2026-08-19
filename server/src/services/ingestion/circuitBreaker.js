const state = { status: 'healthy', consecutiveFailures: 0, openedAt: null, threshold: 3, cooldownMs: 5 * 60 * 1000 };
export function canRequest() { if (state.status !== 'tripped') return true; if (Date.now() - state.openedAt >= state.cooldownMs) { state.status = 'cooldown'; return true; } return false; }
export function recordSuccess() { state.status = 'healthy'; state.consecutiveFailures = 0; state.openedAt = null; }
export function recordFailure() { state.consecutiveFailures += 1; if (state.consecutiveFailures >= state.threshold) { state.status = 'tripped'; state.openedAt = Date.now(); } }
export function breakerStatus() { return { ...state, retryAt: state.openedAt ? new Date(state.openedAt + state.cooldownMs) : null }; }
