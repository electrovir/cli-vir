import {describe, itCases} from '@augment-vir/test';
import {ArgValueType, FlagRequirement} from './arg-definition.js';
import {generateHelpMessage} from './help-message.js';

describe(generateHelpMessage.name, () => {
    function testGenerateHelpMessage(...params: Parameters<typeof generateHelpMessage>) {
        return generateHelpMessage(...params).trim();
    }

    itCases(testGenerateHelpMessage, [
        {
            it: 'works',
            inputs: [
                {
                    inputFile: {
                        position: 0,
                        required: true,
                        description: 'Path to the input file.',
                    },
                    optionalMode: {
                        position: 1,
                        description: 'Optional mode toggle.',
                        type: [
                            'a',
                            'b',
                        ],
                    },
                    verbose: {
                        flag: {
                            valueRequirement: FlagRequirement.Blocked,
                            aliases: [
                                'v',
                            ],
                        },
                        description: 'Increase verbosity.',
                    },
                    count: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        type: ArgValueType.Number,
                        description: 'Number of times to run.',
                    },
                },
                {
                    binName: 'cli-vir-test',
                },
            ],
            expect: `
NAME
    cli-vir-test

SYNOPSIS
    cli-vir-test [options] <input-file> [<optional-mode>]

POSITIONAL ARGUMENTS
    <input-file>                Path to the input file. (required; type: string)
    <optional-mode>             Optional mode toggle. (optional; type: a|b)

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --count <number>            Number of times to run.  (type: number; value required)
    --verbose, -v               Increase verbosity.
            `.trim(),
        },
        {
            it: 'annotates first positional that stops option parsing (disableFlags)',
            inputs: [
                (() => {
                    const defs: any = {
                        first: {position: 0},
                        legacy: {position: {index: 1, disableFlags: true}},
                        later: {position: 2},
                    };
                    return defs;
                })(),
                {binName: 'legacy-stop'},
            ],
            expect: `
NAME
    legacy-stop

SYNOPSIS
    legacy-stop [<first>] [<legacy>] [<later>]

POSITIONAL ARGUMENTS
    <first>                     (optional; type: string)
    <legacy>                    (optional; type: string) Stops option parsing; all following arguments are treated as positional.
    <later>                     (optional; type: string)
            `.trim(),
        },
        {
            it: 'handles empty definitions (only synopsis)',
            inputs: [
                {},
                {binName: 'empty-bin', commandDescription: undefined},
            ],
            expect: `
NAME
    empty-bin

SYNOPSIS
    empty-bin
            `.trim(),
        },
        {
            it: 'trims command description lines and preserves internal blank line',
            inputs: [
                {},
                {
                    binName: 'desc-trim',
                    commandDescription: '  First line.  \n\n Second line after blank.  ',
                },
            ],
            expect: `
NAME
    desc-trim

SYNOPSIS
    desc-trim

DESCRIPTION
      First line.
    
     Second line after blank.
            `.trim(),
        },
        {
            it: 'deduplicates aliases and sorts flags',
            inputs: [
                {
                    zebra: {
                        flag: {
                            aliases: [
                                'z',
                                'Z',
                                'z',
                            ],
                        },
                        description: 'Zebra.',
                    },
                    apple: {
                        flag: {
                            aliases: [
                                'a',
                                'a',
                                'A',
                            ],
                        },
                        description: 'Apple.',
                    },
                },
                {binName: 'alias-test'},
            ],
            expect: `
NAME
    alias-test

SYNOPSIS
    alias-test [options]

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --apple, -a, -A [<string>]
                            Apple.  (type: string)
    --zebra, -z, -Z [<string>]
                            Zebra.  (type: string)
            `.trim(),
        },
        {
            it: 'wraps very long flag with no description (only meta)',
            inputs: [
                {
                    longLongLongLongLongLongLongLongLongName: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        required: true,
                    },
                },
                {binName: 'wrap-meta'},
            ],
            expect: `
NAME
    wrap-meta

SYNOPSIS
    wrap-meta [options]

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --long-long-long-long-long-long-long-long-long-name <string>
                            (required; type: string; value required)
            `.trim(),
        },
        {
            it: 'omits type meta for boolean and string primitive flags',
            inputs: [
                {
                    boolFlag: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: ArgValueType.Boolean,
                    },
                    strFlag: {flag: {valueRequirement: FlagRequirement.Optional}},
                },
                {binName: 'primitive-meta'},
            ],
            expect: `
NAME
    primitive-meta

SYNOPSIS
    primitive-meta [options]

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --bool-flag <boolean>       (value required)
    --str-flag [<string>]       (type: string; value optional)
            `.trim(),
        },
        {
            it: 'renders a command description section',
            inputs: [
                {
                    input: {position: 0},
                },
                {binName: 'with-desc', commandDescription: 'A helpful one-line description.'},
            ],
            expect: `
NAME
    with-desc

SYNOPSIS
    with-desc [<input>]

DESCRIPTION
    A helpful one-line description.

POSITIONAL ARGUMENTS
    <input>                     (optional; type: string)
            `.trim(),
        },
        {
            it: 'renders a multi-line command description section',
            inputs: [
                {
                    input: {position: 0, required: true},
                },
                {
                    binName: 'with-multiline-desc',
                    commandDescription: 'Line one.\nLine two.\nLine three.',
                },
            ],
            expect: `
NAME
    with-multiline-desc

SYNOPSIS
    with-multiline-desc <input>

DESCRIPTION
    Line one.
    Line two.
    Line three.

POSITIONAL ARGUMENTS
    <input>                     (required; type: string)
            `.trim(),
        },
        {
            it: 'handles missing bin name',
            inputs: [
                {
                    inputFile: {
                        position: 0,
                        required: true,
                        description: 'Path to the input file.',
                    },
                    optionalMode: {
                        position: 1,
                        description: 'Optional mode toggle.',
                        type: [
                            'a',
                            'b',
                        ],
                    },
                    verbose: {
                        flag: {
                            valueRequirement: FlagRequirement.Blocked,
                            aliases: [
                                'v',
                            ],
                        },
                        description: 'Increase verbosity.',
                    },
                    count: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        type: ArgValueType.Number,
                        description: 'Number of times to run.',
                    },
                },
            ],
            expect: `
SYNOPSIS
    [options] <input-file> [<optional-mode>]

POSITIONAL ARGUMENTS
    <input-file>                Path to the input file. (required; type: string)
    <optional-mode>             Optional mode toggle. (optional; type: a|b)

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --count <number>            Number of times to run.  (type: number; value required)
    --verbose, -v               Increase verbosity.
            `.trim(),
        },
        {
            it: 'works with lots of options',
            inputs: [
                {
                    requiredPos: {
                        position: 0,
                        required: true,
                        description: 'First positional.',
                    },
                    optionalPos: {
                        position: 1,
                        description: 'Second positional.',
                    },
                    blockedFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Blocked,
                            aliases: [
                                'b',
                            ],
                        },
                        description: 'No value accepted.',
                    },
                    optionalValueFlag: {
                        flag: true,
                        description: 'Optional value flag.',
                    },
                    requiredValueFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        description: 'Requires a value.',
                    },
                    repeatableFlag: {
                        flag: {
                            allowMultiple: true,
                            valueRequirement: FlagRequirement.Optional,
                        },
                        description: 'Repeatable flag.',
                    },
                    numberFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        type: ArgValueType.Number,
                        description: 'Number value.',
                    },
                    booleanFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        type: ArgValueType.Boolean,
                        description: 'Boolean value.',
                    },
                    enumArrayFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        type: [
                            'red',
                            'green',
                            'blue',
                        ],
                        description: 'Array enum.',
                    },
                    enumObjectFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        type: {
                            first: 'one',
                            second: 'two',
                        },
                        description: 'Object enum.',
                    },
                    longNamedFlagThatShouldWrapDescription: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        description:
                            'This description should wrap because the left side is very long.',
                    },
                },
                {
                    binName: 'wrap-test',
                },
            ],
            expect: `
NAME
    wrap-test

SYNOPSIS
    wrap-test [options] <required-pos> [<optional-pos>]

POSITIONAL ARGUMENTS
    <required-pos>              First positional. (required; type: string)
    <optional-pos>              Second positional. (optional; type: string)

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --blocked-flag, -b          No value accepted.
    --boolean-flag <boolean>    Boolean value.  (value required)
    --enum-array-flag <value>   Array enum.  (type: red|green|blue; value required)
    --enum-object-flag <value>
                            Object enum.  (type: one|two; value required)
    --long-named-flag-that-should-wrap-description <string>
                            This description should wrap because the left side is very long.  (type: string; value required)
    --number-flag <number>      Number value.  (type: number; value required)
    --optional-value-flag [<string>]
                            Optional value flag.
    --repeatable-flag [<string>]
                            Repeatable flag.  (repeatable; type: string; value optional)
    --required-value-flag <string>
                            Requires a value.  (type: string; value required)
                `.trim(),
        },
        {
            it: 'handles only positionals (no options section)',
            inputs: [
                {
                    firstPos: {
                        position: 0,
                        required: true,
                        description: 'First.',
                    },
                    secondPosNoDesc: {
                        position: 1,
                    },
                },
                {binName: 'pos-only'},
            ],
            expect: `
NAME
    pos-only

SYNOPSIS
    pos-only <first-pos> [<second-pos-no-desc>]

POSITIONAL ARGUMENTS
    <first-pos>                 First. (required; type: string)
    <second-pos-no-desc>        (optional; type: string)
            `.trim(),
        },
        {
            it: 'handles only flags (no positionals section)',
            inputs: [
                {
                    requiredFlag: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        required: true,
                        description: 'Required flag description.',
                    },
                    loneBlocked: {
                        flag: {valueRequirement: FlagRequirement.Blocked},
                    },
                },
                {binName: 'flags-only'},
            ],
            expect: `
NAME
    flags-only

SYNOPSIS
    flags-only [options]

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --lone-blocked
    --required-flag <string>    Required flag description.  (required; type: string; value required)
            `.trim(),
        },
        {
            it: 'derives bin name from fileName and formats camelCase and underscores',
            inputs: [
                {
                    someCamelCasePositional: {
                        position: 0,
                        required: true,
                        description: 'Camel case positional.',
                    },
                    some_flag_name: {
                        flag: true,
                        description: 'Underscore flag.',
                    },
                    someCamelFlag: {
                        flag: true,
                        description: 'Camel case flag.',
                    },
                },
                {
                    importMeta: {
                        filename: '/random/path/my-cli.ts',
                    } as unknown as ImportMeta,
                },
            ],
            expect: `
NAME
    my-cli.ts

SYNOPSIS
    my-cli.ts [options] <some-camel-case-positional>

POSITIONAL ARGUMENTS
    <some-camel-case-positional>
                            Camel case positional. (required; type: string)

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --some-flag-name [<string>]
                            Underscore flag.
    --some-camel-flag [<string>]
                            Camel case flag.
            `.trim(),
        },
        {
            it: 'throws on invalid positional type',
            inputs: [
                {
                    badType: {
                        // @ts-expect-error: intentional invalid type to cover error branch
                        type: 'purple',
                        position: 0,
                    },
                },
            ],
            throws: {matchMessage: 'Unexpected arg value type'},
        },
        {
            it: 'throws on invalid flag primitive type',
            inputs: [
                {
                    badFlagType: {
                        // @ts-expect-error: intentional invalid type to cover error branch
                        type: 'purple',
                        flag: true,
                    },
                },
            ],
            throws: {matchMessage: 'Unexpected arg value type'},
        },
        {
            it: 'renders optional number flag type and value optional meta',
            inputs: [
                {
                    optNum: {
                        flag: {valueRequirement: FlagRequirement.Optional},
                        type: ArgValueType.Number,
                        description: 'Optional number flag.',
                    },
                },
                {binName: 'optional-meta'},
            ],
            expect: `
NAME
    optional-meta

SYNOPSIS
    optional-meta [options]

OPTIONS
    (All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)

    --opt-num [<number>]        Optional number flag.  (type: number; value optional)
            `.trim(),
        },
        {
            it: 'sorts mixed positional index definitions',
            inputs: [
                {
                    zero: {position: 0, description: 'Zero.'},
                    two: {position: {index: 2}, description: 'Two.'},
                    one: {position: {index: 1}, description: 'One.'},
                },
                {binName: 'mixed-pos'},
            ],
            expect: `
NAME
    mixed-pos

SYNOPSIS
    mixed-pos [<zero>] [<one>] [<two>]

POSITIONAL ARGUMENTS
    <zero>                      Zero. (optional; type: string)
    <one>                       One. (optional; type: string)
    <two>                       Two. (optional; type: string)
            `.trim(),
        },
        {
            it: 'renders rest positional last with rest meta',
            inputs: [
                {
                    first: {position: 0, description: 'First.'},
                    restItems: {position: {rest: true}, description: 'Remaining items.'},
                    middle: {position: 1, description: 'Middle.'},
                },
                {binName: 'rest-pos'},
            ],
            expect: `
NAME
    rest-pos

SYNOPSIS
    rest-pos [<first>] [<middle>] [<rest-items...>]

POSITIONAL ARGUMENTS
    <first>                     First. (optional; type: string)
    <middle>                    Middle. (optional; type: string)
    <rest-items...>             Remaining items. (optional; type: string; rest)
            `.trim(),
        },
    ]);
});
