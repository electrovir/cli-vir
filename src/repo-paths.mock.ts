import {join, resolve} from 'node:path';

export const repoDirPath = resolve(import.meta.dirname, '..');
export const scriptMockFilePath = join(repoDirPath, 'src', 'script.mock.ts');
