import fse from 'fs-extra';
import path from 'path';

export function readPackageJSON(dir: string) {
  const file = path.join(dir, 'package.json');
  if (fse.existsSync(file)) {
    return fse.readJSONSync(file);
  }
  return null;
}
