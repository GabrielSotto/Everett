import { spawn } from 'node:child_process';

export async function runProcess(command, args, { cwd, timeoutMs, onStdout, onStderr } = {}) {
  let stdout = '';
  let stderr = '';
  let startError = null;
  let timedOut = false;
  const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
    onStdout?.(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
    onStderr?.(chunk);
  });
  child.once('error', (error) => {
    startError = error.message;
  });
  const timer = timeoutMs
    ? setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs)
    : null;
  const result = await new Promise((accept) =>
    child.once('close', (exitCode, signal) => {
      if (timer !== null) clearTimeout(timer);
      accept({ exitCode, signal, startError, timedOut, stdout, stderr });
    }),
  );
  return result;
}
