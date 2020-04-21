import path from 'path';
import webpack from 'webpack';
import fse from 'fs-extra';
import { createWebpackConfig } from '../utils/createWebpackConfig';
import { readPackageJSON } from '../utils/readPackageJson';
import { getPackagesSync, Package } from '@manypkg/get-packages';
import { runCommand } from '../utils/runCommand';

export async function projectNodeBuild(_argv: Array<string>) {
  const workspaceInfo = getPackagesSync(process.cwd());
  const workspaceRootPath = workspaceInfo.root.dir;
  const projectPath = path.resolve(process.cwd());
  const buildPath = path.join(projectPath, 'build');
  const buildNodeModulesPath = path.join(buildPath, 'node_modules');
  const projectPkgPath = path.resolve(projectPath, 'package.json');
  const srcPath = path.join(projectPath, 'src');
  const entryPath = path.join(srcPath, 'index.ts');
  const buildPkgPath = path.resolve(buildPath, 'package.json');
  const buildLockPath = path.resolve(buildPath, 'yarn.lock');
  const publicBuildPath = path.join(buildPath, 'public');
  const workspaceLockPath = path.resolve(workspaceRootPath, 'yarn.lock');
  const workspacePkg = workspaceInfo.root.packageJson;
  const projectPkg = readPackageJSON(projectPath);

  const internals = workspaceInfo.packages.map(pkg => pkg.packageJson.name);

  if (fse.existsSync(buildPath)) {
    fse.emptyDirSync(buildPath);
  }

  process.on('SIGINT', () => {
    process.exit();
  });

  const serverConfig = createWebpackConfig({
    env: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    projectPath,
    buildPath,
    entryPath,
    publicBuildPath,
    internals,
  });

  process.on('SIGINT', () => {
    process.exit();
  });

  const serverCompiler = webpack(serverConfig);

  serverCompiler.run((error, stats) => {
    if (error || stats.hasErrors()) {
      process.exitCode = 1;
    } else {
      // create package.json and yarn.lock
      generateFiles().then(() => {
        const result = runCommand('yarn', buildPath);
        console.log(result);
        if (fse.existsSync(buildNodeModulesPath)) {
          fse.emptyDirSync(buildNodeModulesPath);
        }
      });
    }
  });

  async function generateFiles() {
    const pkg = await fse.readJSON(projectPkgPath);
    const deleteKeys = ['devDependencies', 'peerDependencies', 'main', 'license'];
    deleteKeys.forEach(key => {
      if (pkg[key]) {
        delete pkg[key];
      }
    });
    if (pkg.dependencies) {
      pkg.dependencies = extractDeps(workspaceInfo.packages, projectPkg.name);
    }
    if (workspacePkg.resolutions) {
      pkg.resolutions = workspacePkg.resolutions;
    }
    pkg.scripts = {
      start: 'NODE_ENV=production node ./main.js',
    };
    fse.writeJSONSync(buildPkgPath, pkg);
    fse.copySync(workspaceLockPath, buildLockPath);
    // fse.copySync(path.resolve(root, '.env'), path.resolve(outputDir, '.env'));
    // if (fse.existsSync(path.resolve(root, '.env.production'))) {
    //   fse.copySync(
    //     path.resolve(root, '.env.production'),
    //     path.resolve(outputDir, '.env.production')
    //   );
    //   spinner.succeed('Copy .env.production');
    // }
  }
}

interface Deps {
  [key: string]: string;
}

function extractDeps(packages: Array<Package>, packageName: string): Deps {
  const externalDeps: Array<{ pkg: string; deps: Deps }> = [];
  const pkg = packages.find(p => p.packageJson.name === packageName);
  if (!pkg) {
    throw new Error(`Canoot find packages ${packageName}`);
  }
  const deps = Object.keys(pkg.packageJson.dependencies || {}).reduce<Deps>((acc, depName) => {
    const isInternal = packages.find(p => p.packageJson.name === depName);
    if (isInternal) {
      externalDeps.push({ pkg: depName, deps: extractDeps(packages, depName) });
    } else {
      acc[depName] = pkg.packageJson.dependencies[depName];
    }
    return acc;
  }, {});

  externalDeps.forEach(subDeps => {
    Object.keys(subDeps.deps).forEach(key => {
      if (deps[key]) {
        if (deps[key] !== subDeps.deps[key]) {
          console.warn(
            [
              `Incompatible version of ${key}`,
              `  ${packageName} (parent) want ${deps[key]}`,
              `  ${subDeps.pkg} (sub) want ${subDeps.deps[key]}`,
            ].join('\n')
          );
        }
      } else {
        deps[key] = subDeps.deps[key];
      }
    });
  });

  return deps;
}
