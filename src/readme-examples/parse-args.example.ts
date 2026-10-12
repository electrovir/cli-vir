import {resolve} from 'node:path';
import {FlagRequirement, parseArgs} from '../index.js';

const myArgs = parseArgs(
    process.argv,
    {
        arg1: {
            flag: {
                valueRequirement: FlagRequirement.Blocked,
            },
        },
        arg2: {
            required: true,
            position: 0,
        },
        arg3: {
            flag: {
                aliases: ['-3'],
                allowMultiple: true,
                valueRequirement: FlagRequirement.Required,
            },
        },
    },
    {
        /** The binName for your package, if relevant. */
        binName: 'cli-vir',
        /** Your package's package.json, used for the `--version` flag. Can be `undefined`. */
        packageJsonPath: resolve(import.meta.dirname, '..', 'package.json'),
        /**
         * Make sure this `import.meta` is accessed in your top level JavaScript/TypeScript file
         * that is being executed.
         */
        importMeta: import.meta,
    },
);

console.info(myArgs.arg1); // boolean
console.info(myArgs.arg2); // string
console.info(myArgs.arg3); // string[]
