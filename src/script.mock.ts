import {resolve} from 'node:path';
import {FlagRequirement} from './arg-definition.js';
import {parseArgs} from './parse-args.js';

const args = parseArgs(
    process.argv,
    process.argv.includes('--insert-help')
        ? {
              help: {
                  flag: {
                      valueRequirement: FlagRequirement.Blocked,
                  },
              },
          }
        : {},
    {
        binName: undefined,
        packageJsonPath: process.argv.includes('--no-version')
            ? undefined
            : resolve(import.meta.dirname, '..', 'package.json'),
        importMeta: import.meta,
        allowUnexpectedArgs: true,
        disableHelp: process.argv.includes('--no-help'),
    },
);

console.info({
    args,
});
