import chalk from 'chalk';
import { projectNodeBuild } from './commands/project-node-build';
import { projectNodeStart } from './commands/project-node-start';

export async function command(argv: Array<string>) {
  const args = argv.slice(2);

  const commands: Array<{
    command: Array<string>;
    exec: (params: Array<string>) => Promise<void>;
  }> = [
    { command: ['project', 'node', 'build'], exec: projectNodeBuild },
    { command: ['project', 'node', 'start'], exec: projectNodeStart },
  ];

  const commandObj = commands.find(c => {
    return c.command.every((v, i) => v === args[i]);
  });
  if (commandObj) {
    const params = args.slice(commandObj.command.length);
    await commandObj.exec(params);
  } else {
    console.error(`Invalid command ${chalk.blue(`${args.join(' ')}`)}`);
  }
}
