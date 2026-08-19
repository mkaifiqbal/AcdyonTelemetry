export async function addAttempt(run, data) { run.attempts.push({ ...data, timestamp: new Date() }); await run.save(); }
export async function finishRun(run, data) { Object.assign(run, data, { finishedAt: new Date() }); await run.save(); return run; }
