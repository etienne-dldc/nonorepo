import { spawnSync } from 'child_process';

export function runCommand(command: string, cwd?: string): string {
  const [c, ...args] = command.split(' ');
  const result = spawnSync(c, args, {
    encoding: 'UTF8',
    env: process.env,
    stdio: 'pipe',
    cwd,
  });

  return result.stdout
    .toString()
    .trim()
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}
