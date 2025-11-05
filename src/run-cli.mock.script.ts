import {FlagRequirement} from './arg-definition.js';
import {parseArgs} from './parse-args.js';

const args = parseArgs(
    process.argv,
    {
        value: {
            flag: {
                allowMultiple: true,
                valueRequirement: FlagRequirement.Required,
            },
        },
    },
    {
        binName: undefined,
        importMeta: import.meta,
    },
);

console.info(JSON.stringify(args));
