# cli-vir

Type safe CLI argument parser.

-   Allows single (`-f`, `-force`) or double (`--f`, `--force`) dashes for both short and long flag arguments.
-   Accepts camelCase, kebab-case, or snake_case flag name variants with case insensitivity.
-   Allows restricting arg values to a set of known values.
-   Can convert truthy and falsy strings to booleans (`'t'`, `'true'`, `1`, `'f'`, `'false'`, `0`).
-   Provides type safe values.
-   Prints man page styled documentation when parsing fails.
-   Automatically excludes the bin name or script path from raw arguments.
-   and many more features...

Reference docs: https://electrovir.github.io/cli-vir

## Install

```sh
npm i cli-vir
```

## Usage

Use `parseArgs`:

<!-- example-link: src/readme-examples/parse-args.example.ts -->

```TypeScript
import {FlagRequirement, parseArgs} from 'cli-vir';

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
```
