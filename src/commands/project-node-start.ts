import path from 'path';
import webpack from 'webpack';
import nodemon from 'nodemon';
import { createWebpackConfig } from '../utils/createWebpackConfig';

export async function projectNodeStart(_argv: Array<string>) {
  const projectPath = path.resolve(process.cwd());
  const buildPath = path.join(projectPath, 'build');
  const publicBuildPath = path.join(buildPath, 'public');
  const srcPath = path.join(projectPath, 'src');
  const entryPath = path.join(srcPath, 'index.ts');

  const serverConfig = createWebpackConfig({
    env: 'development',
    buildPath,
    entryPath,
    projectPath,
    publicBuildPath,
  });

  process.on('SIGINT', () => process.exit());

  const serverCompiler = webpack(serverConfig);

  const startServer = () => {
    const serverPaths = Object.keys(serverCompiler.options.entry as any).map(entry =>
      path.join((serverCompiler.options.output as any).path, `${entry}.js`)
    );
    nodemon({ script: serverPaths[0], watch: serverPaths, nodeArgs: process.argv.slice(2) }).on(
      'quit',
      process.exit
    );
  };

  const startServerOnce = once((err, _stats) => {
    if (err) return;
    startServer();
  });
  serverCompiler.watch(serverConfig.watchOptions || {}, startServerOnce);
}

function once<T extends (...args: Array<any>) => any>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;
  return ((...args: Parameters<T>): ReturnType<T> => {
    if (called) {
      return result;
    }
    called = true;
    result = fn(...args);
    return result;
  }) as any;
}
