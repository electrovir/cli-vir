import {assert} from '@augment-vir/assert';
import {removeColor, type PartialWithUndefined} from '@augment-vir/common';
import {interpolationSafeWindowsPath, runShellCommand} from '@augment-vir/node';
import {describe, it, itCases} from '@augment-vir/test';
import {basename} from 'node:path';
import {ArgValueType, FlagRequirement, type ArgDefinitions} from './arg-definition.js';
import {type ParseArgsParams} from './parse-args-params.js';
import {parseArgs, parseStrippedArgs} from './parse-args.js';
import {repoDirPath, scriptMockFilePath} from './repo-paths.mock.js';

enum StringEnum {
    One = 'one',
    Two = 'two',
    Three = 'three',
}

enum NumberEnum {
    One,
    Two,
    Three,
}

describe(parseArgs.name, () => {
    it('has proper types', () => {
        assert.tsType(
            parseArgs(
                [],
                {},
                {
                    binName: undefined,
                    importMeta: import.meta,
                },
            ),
            // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        ).equals<{}>;

        const value = parseArgs(
            [
                '--requiredOptionalNumberFlag',
                '--requiredOptionalValueFlag',
                '--requiredRequiredValueFlag=five',
                '--requiredBlockedValueFlag',
                'position0',
            ],
            {
                optionalPositional: {
                    position: 1,
                },
                requiredPositional: {
                    required: true,
                    position: 0,
                },
                numericPositional: {
                    position: 2,
                    type: ArgValueType.Number,
                },
                stringEnumPositional: {
                    type: StringEnum,
                    position: 3,
                },
                numberEnumPositional: {
                    type: NumberEnum,
                    position: 4,
                },
                arrayPositional: {
                    type: [
                        'a',
                        'b',
                        1,
                        2,
                    ],
                    position: 5,
                },
                restPositional: {
                    position: {
                        rest: true,
                    },
                },

                multiFlag: {
                    flag: {
                        allowMultiple: true,
                    },
                },
                requiredOptionalNumberFlag: {
                    required: true,
                    type: ArgValueType.Number,
                    flag: {},
                },
                requiredOptionalValueFlag: {
                    required: true,
                    flag: true,
                },
                requiredRequiredValueFlag: {
                    required: true,
                    flag: {
                        valueRequirement: FlagRequirement.Required,
                    },
                },
                requiredBlockedValueFlag: {
                    required: true,
                    flag: {
                        valueRequirement: FlagRequirement.Blocked,
                    },
                },
                optionalOptionalValueFlag: {
                    flag: {},
                },
                optionalRequiredValueFlag: {
                    flag: {
                        valueRequirement: FlagRequirement.Required,
                    },
                },
                optionalBlockedValueFlag: {
                    flag: {
                        valueRequirement: FlagRequirement.Blocked,
                    },
                },
            },
            {
                binName: undefined,
                importMeta: import.meta,
            },
        );

        assert.tsType(value.numberEnumPositional).equals<NumberEnum | undefined>();
        assert.tsType(value.numberEnumPositional).notEquals<number | undefined>();

        assert.tsType(value).equals<{
            optionalPositional: string | undefined;
            requiredPositional: string;
            numericPositional: number | undefined;
            stringEnumPositional: StringEnum | undefined;
            numberEnumPositional: NumberEnum | undefined;
            arrayPositional: undefined | 'a' | 'b' | 1 | 2;
            restPositional: string[];

            multiFlag: (string | true)[];
            requiredOptionalNumberFlag: number | true;
            requiredRequiredValueFlag: string;
            requiredOptionalValueFlag: string | true;
            requiredBlockedValueFlag: boolean;
            optionalRequiredValueFlag: string | false;
            optionalOptionalValueFlag: string | boolean;
            optionalBlockedValueFlag: boolean;
        }>;
    });

    function testParseStrippedArgs(
        relevantArgs: string[],
        argDefinitions: Readonly<ArgDefinitions>,
        params?: Readonly<PartialWithUndefined<ParseArgsParams>> | undefined,
    ) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        return parseStrippedArgs(relevantArgs, argDefinitions, {
            disableFailureHelp: true,
            ...params,
        });
    }

    itCases(testParseStrippedArgs, [
        {
            it: 'handles empty args',
            inputs: [
                [],
                {},
            ],
            expect: {},
        },
        {
            it: 'treats flags as positional after a positional with disableFlags',
            inputs: [
                [
                    'start',
                    '--f',
                ],
                {
                    start: {
                        position: {
                            index: 0,
                            disableFlags: true,
                        },
                    },
                    rest: {
                        position: {rest: true},
                    },
                },
            ],
            expect: {
                start: 'start',
                rest: ['--f'],
            },
        },
        {
            it: 'parses all remaining args into a rest positional (only arg)',
            inputs: [
                [
                    'one',
                    'two',
                    'three',
                ],
                {
                    restValues: {
                        position: {
                            rest: true,
                        },
                    },
                },
            ],
            expect: {
                restValues: [
                    'one',
                    'two',
                    'three',
                ],
            },
        },
        {
            it: 'parses a single rest arg into an array',
            inputs: [
                [
                    'one',
                ],
                {
                    restValues: {
                        position: {
                            rest: true,
                        },
                    },
                },
            ],
            expect: {
                restValues: [
                    'one',
                ],
            },
        },
        {
            it: 'sets rest to array even when empty',
            inputs: [
                [],
                {
                    restValues: {
                        position: {
                            rest: true,
                        },
                    },
                },
            ],
            expect: {
                restValues: [],
            },
        },
        {
            it: 'parses a normal positional followed by a rest positional collecting the rest',
            inputs: [
                [
                    'first',
                    'second',
                    'third',
                ],
                {
                    first: {position: 0},
                    restValues: {
                        position: {
                            rest: true,
                        },
                    },
                },
            ],
            expect: {
                first: 'first',
                restValues: [
                    'second',
                    'third',
                ],
            },
        },
        {
            it: 'allows rest positional declared before indexed positional (reordered internally)',
            inputs: [
                [
                    'first',
                    'second',
                    'third',
                ],
                {
                    restValues: {
                        position: {
                            rest: true,
                        },
                    },
                    last: {position: 0},
                },
            ],
            expect: {
                last: 'first',
                restValues: [
                    'second',
                    'third',
                ],
            },
        },
        {
            it: 'parses typed number values for a rest positional',
            inputs: [
                [
                    '1',
                    '2',
                    '3',
                ],
                {
                    numbers: {
                        position: {
                            rest: true,
                        },
                        type: ArgValueType.Number,
                    },
                },
            ],
            expect: {
                numbers: [
                    1,
                    2,
                    3,
                ],
            },
        },
        {
            it: 'errors when required rest positional has no values',
            inputs: [
                [],
                {
                    items: {
                        position: {
                            rest: true,
                        },
                        required: true,
                    },
                },
            ],
            throws: {matchMessage: 'Missing required arg items'},
        },
        {
            it: 'errors if more than one rest positional is declared',
            inputs: [
                [
                    'a',
                ],
                {
                    first: {
                        position: {
                            rest: true,
                        },
                    },
                    second: {
                        position: {
                            rest: true,
                        },
                    },
                },
            ],
            throws: {matchMessage: 'Only one rest positional argument is allowed'},
        },
        /** Basic flag name variations and alias handling ** */
        {
            it: 'handles camelCase flag',
            inputs: [
                ['--oneFlag'],
                {
                    oneFlag: {
                        flag: true,
                    },
                },
            ],
            expect: {
                oneFlag: true,
            },
        },
        {
            it: 'handles single dash',
            inputs: [
                ['-oneFlag'],
                {
                    oneFlag: {
                        flag: true,
                    },
                },
            ],
            expect: {
                oneFlag: true,
            },
        },
        {
            it: 'rejects flag without dash',
            inputs: [
                ['oneFlag'],
                {
                    oneFlag: {
                        flag: true,
                    },
                },
            ],
            throws: {
                matchMessage: 'Unexpected positional arg at 0',
            },
        },
        {
            it: 'handles kebab-case flag',
            inputs: [
                ['--one-flag'],
                {
                    oneFlag: {
                        flag: true,
                    },
                },
            ],
            expect: {
                oneFlag: true,
            },
        },
        {
            it: 'handles snake_case flag',
            inputs: [
                ['--one_flag'],
                {
                    oneFlag: {
                        flag: true,
                    },
                },
            ],
            expect: {
                oneFlag: true,
            },
        },
        {
            it: 'is case insensitive',
            inputs: [
                ['--oNeFlAg'],
                {
                    oneFlag: {
                        flag: true,
                    },
                },
            ],
            expect: {
                oneFlag: true,
            },
        },
        {
            it: 'allows multi flags',
            inputs: [
                [
                    '--oneFlag',
                    '--oneFlag=five',
                    '--oneFlag',
                ],
                {
                    oneFlag: {
                        flag: {
                            allowMultiple: true,
                        },
                    },
                },
            ],
            expect: {
                oneFlag: [
                    true,
                    'five',
                    true,
                ],
            },
        },
        {
            it: 'requires flag values',
            inputs: [
                [
                    '--oneFlag',
                ],
                {
                    oneFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                    },
                },
            ],
            throws: {
                matchMessage: 'Missing required flag value',
            },
        },
        {
            it: 'reads flag values after a space',
            inputs: [
                [
                    '--oneFlag',
                    'value',
                ],
                {
                    oneFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                    },
                },
            ],
            expect: {
                oneFlag: 'value',
            },
        },
        {
            it: 'reads flag values after an equal sign space',
            inputs: [
                [
                    '--oneFlag=value',
                ],
                {
                    oneFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                    },
                },
            ],
            expect: {
                oneFlag: 'value',
            },
        },
        {
            it: 'allows space around equal signs',
            inputs: [
                [
                    '--oneFlag',
                    '=',
                    'value',
                ],
                {
                    oneFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                    },
                },
            ],
            expect: {
                oneFlag: 'value',
            },
        },
        {
            it: 'reads an alias',
            inputs: [
                [
                    '-f',
                    '=',
                    'value',
                ],
                {
                    oneFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                            aliases: [
                                'f',
                            ],
                        },
                    },
                },
            ],
            expect: {
                oneFlag: 'value',
            },
        },
        {
            it: 'allows a position arg after a blocked flag arg',
            inputs: [
                [
                    '--oneFlag',
                    'myValue',
                ],
                {
                    oneFlag: {
                        flag: {
                            valueRequirement: FlagRequirement.Blocked,
                        },
                    },
                    positional: {
                        position: 0,
                    },
                },
            ],
            expect: {
                oneFlag: true,
                positional: 'myValue',
            },
        },
        {
            it: 'parses a numeric arg',
            inputs: [
                ['5'],
                {
                    oneFlag: {
                        required: true,
                        position: 0,
                        type: ArgValueType.Number,
                    },
                },
            ],
            expect: {
                oneFlag: 5,
            },
        },
        {
            it: 'parses a numeric arg',
            inputs: [
                ['5'],
                {
                    oneFlag: {
                        required: true,
                        position: 0,
                        type: ArgValueType.Number,
                    },
                },
            ],
            expect: {
                oneFlag: 5,
            },
        },
        {
            it: 'rejects a missing positional arg',
            inputs: [
                [],
                {
                    oneFlag: {
                        required: true,
                        position: 0,
                    },
                },
            ],
            throws: {
                matchMessage: 'Missing required arg',
            },
        },
        {
            it: 'parses required, optional, and blocked flags together',
            inputs: [
                [
                    '--req=value',
                    '--opt',
                    '--blk',
                ],
                {
                    req: {flag: {valueRequirement: FlagRequirement.Required}},
                    opt: {flag: true},
                    blk: {flag: {valueRequirement: FlagRequirement.Blocked}},
                },
            ],
            expect: {
                req: 'value',
                opt: true,
                blk: true,
            },
        },
        {
            it: 'errors when blocked flag is given a value',
            inputs: [
                [
                    '--blk=value',
                ],
                {
                    blk: {flag: {valueRequirement: FlagRequirement.Blocked}},
                },
            ],
            throws: {
                matchMessage: 'arg does not allow a value',
            },
        },
        {
            it: 'errors when required flag missing value (with equals sign and nothing after)',
            inputs: [
                [
                    '--need=',
                ],
                {
                    need: {flag: {valueRequirement: FlagRequirement.Required}},
                },
            ],
            throws: {
                matchMessage: 'Missing required flag value',
            },
        },
        {
            it: 'treats empty equals then separate value as value',
            inputs: [
                [
                    '--name=',
                    'abc',
                ],
                {
                    name: {flag: {valueRequirement: FlagRequirement.Required}},
                },
            ],
            expect: {
                name: 'abc',
            },
        },
        {
            it: 'ignore flag equals with no value',
            inputs: [
                [
                    '--myFlag=',
                ],
                {
                    myFlag: {flag: {}},
                },
            ],
            expect: {
                myFlag: true,
            },
        },
        {
            it: 'last occurrence of non-multi flag wins',
            inputs: [
                [
                    '--single=first',
                    '--single=second',
                ],
                {
                    single: {flag: {valueRequirement: FlagRequirement.Required}},
                },
            ],
            expect: {
                single: 'second',
            },
        },
        {
            it: 'multi flag collects values and boolean presences',
            inputs: [
                [
                    '--multi',
                    '--multi=5',
                    '--multi',
                    '10',
                ],
                {
                    multi: {flag: {allowMultiple: true}},
                },
            ],
            expect: {
                multi: [
                    true,
                    '5',
                    '10',
                ],
            },
        },
        {
            it: 'multi flag with required values errors when one missing',
            inputs: [
                [
                    '--multi=1',
                    '--multi',
                ],
                {
                    multi: {
                        flag: {
                            allowMultiple: true,
                            valueRequirement: FlagRequirement.Required,
                        },
                    },
                },
            ],
            throws: {matchMessage: 'Missing required flag value'},
        },
        {
            it: 'multi blocked flag errors if any occurrence has a value',
            inputs: [
                [
                    '--flag',
                    '--flag=oops',
                ],
                {
                    flag: {
                        flag: {
                            allowMultiple: true,
                            valueRequirement: FlagRequirement.Blocked,
                        },
                    },
                },
            ],
            throws: {matchMessage: 'arg does not allow a value'},
        },
        {
            it: 'parses number flag value',
            inputs: [
                [
                    '--count=42',
                ],
                {
                    count: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: ArgValueType.Number,
                    },
                },
            ],
            expect: {count: 42},
        },
        {
            it: 'errors on invalid number',
            inputs: [
                [
                    '--count=abc',
                ],
                {
                    count: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: ArgValueType.Number,
                    },
                },
            ],
            throws: {matchMessage: 'Expected a number'},
        },
        {
            it: 'parses boolean flag explicit true/false',
            inputs: [
                [
                    '--truthy=true',
                    '--falsy=false',
                ],
                {
                    truthy: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: ArgValueType.Boolean,
                    },
                    falsy: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: ArgValueType.Boolean,
                    },
                },
            ],
            expect: {truthy: true, falsy: false},
        },
        {
            it: 'rejects invalid boolean',
            inputs: [
                [
                    '--bool=notBool',
                ],
                {
                    bool: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: ArgValueType.Boolean,
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected a boolean',
            },
        },
        {
            it: 'parses string enum (object) and numeric enum values',
            inputs: [
                [
                    '--stringEnum=two',
                    '--numberEnum=1',
                ],
                {
                    stringEnum: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: StringEnum,
                    },
                    numberEnum: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: NumberEnum,
                    },
                },
            ],
            expect: {stringEnum: 'two', numberEnum: 1},
        },
        {
            it: 'errors when enum value invalid',
            inputs: [
                [
                    '--stringEnum=four',
                ],
                {
                    stringEnum: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: StringEnum,
                    },
                },
            ],
            throws: {matchMessage: 'Expected one of'},
        },
        {
            it: 'parses array allowed values (string and number)',
            inputs: [
                [
                    '--list=a',
                    '--numList=2',
                ],
                {
                    list: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: [
                            'a',
                            'b',
                        ],
                    },
                    numList: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: [
                            1,
                            2,
                        ],
                    },
                },
            ],
            expect: {list: 'a', numList: 2},
        },
        {
            it: 'errors on invalid array allowed value',
            inputs: [
                [
                    '--list=c',
                ],
                {
                    list: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: [
                            'a',
                            'b',
                        ],
                    },
                },
            ],
            throws: {matchMessage: 'Expected one of'},
        },
        {
            it: 'supports flag aliases explicitly provided',
            inputs: [
                [
                    '-f',
                    'value',
                ],
                {
                    fullName: {
                        flag: {valueRequirement: FlagRequirement.Required, aliases: ['f']},
                    },
                },
            ],
            expect: {fullName: 'value'},
        },
        {
            it: 'supports automatically expanded kebab/snake/camel aliases',
            inputs: [
                [
                    '--auto-alias',
                    '--auto_alias=value',
                    '--autoAlias',
                ],
                {
                    autoAlias: {flag: {allowMultiple: true}},
                },
            ],
            expect: {
                autoAlias: [
                    true,
                    'value',
                    true,
                ],
            },
        },
        {
            it: 'allows unexpected args when enabled',
            inputs: [
                [
                    '--known',
                    '--unknown',
                    'positional',
                ],
                {
                    known: {
                        flag: {},
                    },
                },
                {
                    allowUnexpectedArgs: true,
                },
            ],
            expect: {
                known: true,
            },
        },
        {
            it: 'parses positionals and flags interleaved',
            inputs: [
                [
                    'first',
                    '--flag',
                    'fake-second',
                    '--flag=value',
                    'real-second',
                ],
                {
                    one: {position: 0},
                    two: {position: 1},
                    three: {position: 2},
                    flag: {
                        flag: {
                            allowMultiple: true,
                        },
                    },
                },
            ],
            expect: {
                one: 'first',
                two: 'real-second',
                three: undefined,
                flag: [
                    'fake-second',
                    'value',
                ],
            },
        },
        {
            it: 'errors missing required positional',
            inputs: [
                [
                    'onlyOne',
                ],
                {
                    first: {position: 0, required: true},
                    second: {position: 1, required: true},
                },
            ],
            throws: {matchMessage: 'Missing required arg'},
        },
        {
            it: 'rejects missing required flag',
            inputs: [
                [
                    '--other',
                ],
                {
                    other: {
                        flag: {},
                    },
                    needed: {
                        flag: {
                            valueRequirement: FlagRequirement.Required,
                        },
                        required: true,
                    },
                },
            ],
            throws: {
                matchMessage: 'Missing required arg',
            },
        },
        {
            it: 'accepts definition keys with leading dashes',
            inputs: [
                [
                    '--real=value',
                ],
                {
                    '--real': {flag: {valueRequirement: FlagRequirement.Required}},
                },
            ],
            expect: {
                real: 'value',
            },
        },
        {
            it: 'blocked flag allows following positional',
            inputs: [
                [
                    '--blk',
                    'pos',
                ],
                {
                    blk: {flag: {valueRequirement: FlagRequirement.Blocked}},
                    pos: {position: 0},
                },
            ],
            expect: {blk: true, pos: 'pos'},
        },
        {
            it: 'blocked multi flags still parse separate occurrences',
            inputs: [
                [
                    '--blk',
                    '--blk',
                ],
                {
                    blk: {
                        flag: {
                            valueRequirement: FlagRequirement.Blocked,
                            allowMultiple: true,
                        },
                    },
                },
            ],
            expect: {
                blk: [
                    true,
                    true,
                ],
            },
        },
        {
            it: 'multi numeric flag parses all numbers',
            inputs: [
                [
                    '--num=1',
                    '--num=2',
                    '--num',
                    '3',
                ],
                {
                    num: {
                        flag: {
                            allowMultiple: true,
                            valueRequirement: FlagRequirement.Required,
                        },
                        type: ArgValueType.Number,
                    },
                },
            ],
            expect: {
                num: [
                    1,
                    2,
                    3,
                ],
            },
        },
        {
            it: 'multi numeric flag error on one invalid number',
            inputs: [
                [
                    '--num=1',
                    '--num=abc',
                ],
                {
                    num: {
                        flag: {
                            allowMultiple: true,
                            valueRequirement: FlagRequirement.Required,
                        },
                        type: ArgValueType.Number,
                    },
                },
            ],
            throws: {matchMessage: 'Expected a number'},
        },
        {
            it: 'accepts valid string enum positional',
            inputs: [
                [
                    'one',
                ],
                {
                    pos: {
                        position: 0,
                        type: StringEnum,
                    },
                },
            ],
            expect: {
                pos: 'one',
            },
        },
        {
            it: 'accepts valid enum positional',
            inputs: [
                [
                    StringEnum.One,
                ],
                {
                    pos: {
                        position: 0,
                        type: StringEnum,
                    },
                },
            ],
            expect: {
                pos: 'one',
            },
        },
        {
            it: 'rejects invalid string enum positional',
            inputs: [
                [
                    'four',
                ],
                {
                    pos: {
                        position: 0,
                        type: StringEnum,
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'rejects case-mismatched string enum value',
            inputs: [
                [
                    '--stringEnum=Two',
                ],
                {
                    stringEnum: {
                        flag: true,
                        type: StringEnum,
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'accepts numeric enum number value',
            inputs: [
                [
                    '--numberEnum=2',
                ],
                {
                    numberEnum: {
                        flag: true,
                        type: NumberEnum,
                    },
                },
            ],
            expect: {
                numberEnum: 2,
            },
        },
        {
            it: 'accepts numeric enum by name',
            inputs: [
                [
                    '--numberEnum=Two',
                ],
                {
                    numberEnum: {
                        flag: true,
                        type: NumberEnum,
                    },
                },
            ],
            expect: {
                numberEnum: 'Two',
            },
        },
        {
            it: 'rejects invalid numeric enum value',
            inputs: [
                [
                    '--numberEnum=5',
                ],
                {
                    numberEnum: {
                        flag: {valueRequirement: FlagRequirement.Required},
                        type: NumberEnum,
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'accepts numeric enum positional by number',
            inputs: [
                [
                    '1',
                ],
                {
                    posNum: {
                        position: 0,
                        type: NumberEnum,
                    },
                },
            ],
            expect: {
                posNum: 1,
            },
        },
        {
            it: 'accepts numeric enum positional by name',
            inputs: [
                [
                    'Three',
                ],
                {
                    posNum: {position: 0, type: NumberEnum},
                },
            ],
            expect: {
                posNum: 'Three',
            },
        },
        {
            it: 'rejects invalid numeric enum positional value',
            inputs: [
                [
                    '6',
                ],
                {
                    posNum: {position: 0, type: NumberEnum},
                },
            ],
            throws: {matchMessage: 'Expected one of'},
        },
        {
            it: 'accepts object-of-values (strings) for flag',
            inputs: [
                [
                    '--obj=alpha',
                ],
                {
                    obj: {
                        flag: true,
                        type: {
                            first: 'alpha',
                            second: 'beta',
                        },
                    },
                },
            ],
            expect: {
                obj: 'alpha',
            },
        },
        {
            it: 'rejects object-of-values key for flag',
            inputs: [
                [
                    '--obj=first',
                ],
                {
                    obj: {
                        flag: true,
                        type: {
                            first: 'alpha',
                            second: 'beta',
                        },
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'rejects invalid object-of-values (strings) for flag',
            inputs: [
                [
                    '--obj=gamma',
                ],
                {
                    obj: {
                        flag: true,
                        type: {
                            first: 'alpha',
                            second: 'beta',
                        },
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'accepts object-of-values (numbers) for flag',
            inputs: [
                [
                    '--numObj=10',
                ],
                {
                    numObj: {
                        flag: true,
                        type: {
                            ten: 10,
                            eleven: 11,
                        },
                    },
                },
            ],
            expect: {
                numObj: 10,
            },
        },
        {
            it: 'rejects invalid object-of-values (numbers) for flag',
            inputs: [
                [
                    '--numObj=12',
                ],
                {
                    numObj: {
                        flag: true,
                        type: {ten: 10, eleven: 11},
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'accepts object-of-values positional',
            inputs: [
                [
                    'beta',
                ],
                {
                    posObj: {
                        position: 0,
                        type: {first: 'alpha', second: 'beta'},
                    },
                },
            ],
            expect: {
                posObj: 'beta',
            },
        },
        {
            it: 'rejects invalid object-of-values positional',
            inputs: [
                [
                    'gamma',
                ],
                {
                    posObj: {position: 0, type: {first: 'alpha', second: 'beta'}},
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'accepts array-of-values positional (string)',
            inputs: [
                [
                    'x',
                ],
                {
                    arr: {
                        position: 0,
                        type: [
                            'x',
                            'y',
                        ],
                    },
                },
            ],
            expect: {
                arr: 'x',
            },
        },
        {
            it: 'rejects array-of-values positional (string)',
            inputs: [
                [
                    'z',
                ],
                {
                    arr: {
                        position: 0,
                        type: [
                            'x',
                            'y',
                        ],
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'accepts a position arg with set index',
            inputs: [
                [
                    'z',
                ],
                {
                    arr: {
                        position: {
                            index: 0,
                        },
                    },
                },
            ],
            expect: {
                arr: 'z',
            },
        },
        {
            it: 'accepts array-of-values flag (number)',
            inputs: [
                [
                    '--numbers=11',
                ],
                {
                    numbers: {
                        flag: true,
                        type: [
                            10,
                            11,
                        ],
                    },
                },
            ],
            expect: {
                numbers: 11,
            },
        },
        {
            it: 'rejects array-of-values flag (number)',
            inputs: [
                [
                    '--numbers=12',
                ],
                {
                    numbers: {
                        flag: true,
                        type: [
                            10,
                            11,
                        ],
                    },
                },
            ],
            throws: {
                matchMessage: 'Expected one of',
            },
        },
        {
            it: 'rejects an invalid arg type',
            inputs: [
                [
                    'z',
                ],
                {
                    arr: {
                        // @ts-expect-error: intentionally invalid type value
                        type: 'purple',
                        position: {
                            index: 0,
                        },
                    },
                },
            ],
            throws: {
                matchMessage: 'Invalid expected arg value type',
            },
        },
        {
            it: 'accepts a custom asserter',
            inputs: [
                [
                    'z',
                ],
                {
                    arr: {
                        position: {
                            index: 0,
                        },
                        customValueAssertion(value) {
                            assert.isDefined(value);
                        },
                    },
                },
            ],
            expect: {
                arr: 'z',
            },
        },
        {
            it: 'rejects a custom asserter',
            inputs: [
                [
                    'z',
                ],
                {
                    arr: {
                        position: {
                            index: 0,
                        },
                        customValueAssertion(value) {
                            assert.isTrue(value);
                        },
                    },
                },
            ],
            throws: {
                matchMessage: 'is not true',
            },
        },
        {
            it: 'accepts a custom asserter in a multi value',
            inputs: [
                [
                    '--flag=z',
                ],
                {
                    flag: {
                        flag: {
                            allowMultiple: true,
                        },
                        customValueAssertion(value) {
                            assert.isDefined(value);
                        },
                    },
                },
            ],
            expect: {
                flag: ['z'],
            },
        },
        {
            it: 'rejects a custom asserter in a multi value',
            inputs: [
                [
                    '--flag=z',
                ],
                {
                    flag: {
                        flag: {
                            allowMultiple: true,
                        },
                        customValueAssertion(value) {
                            assert.isTrue(value);
                        },
                    },
                },
            ],
            throws: {
                matchMessage: 'is not true',
            },
        },
        {
            it: 'sets a missing flag to false',
            inputs: [
                [
                    '--oneFlag',
                ],
                {
                    oneFlag: {
                        flag: true,
                    },
                    twoFlag: {
                        flag: true,
                    },
                },
            ],
            expect: {
                oneFlag: true,
                twoFlag: false,
            },
        },
        {
            it: 'rejects an unexpected flag',
            inputs: [
                [
                    '--invalid',
                ],
                {
                    oneFlag: {
                        flag: true,
                    },
                    twoFlag: {
                        flag: true,
                    },
                },
            ],
            throws: {
                matchMessage: 'Unexpected flag',
            },
        },
        {
            it: 'rejects an unexpected positional argument',
            inputs: [
                [
                    'invalid',
                ],
                {
                    oneFlag: {
                        flag: true,
                    },
                    twoFlag: {
                        flag: true,
                    },
                },
            ],
            throws: {
                matchMessage: 'Unexpected positional',
            },
        },
        {
            it: 'sets an empty array for a missing multi flag',
            inputs: [
                [],
                {
                    multiFlag: {
                        flag: {
                            allowMultiple: true,
                        },
                    },
                },
            ],
            expect: {
                multiFlag: [],
            },
        },
        {
            it: 'rejects a missing multi flag',
            inputs: [
                [],
                {
                    multiFlag: {
                        required: true,
                        flag: {
                            allowMultiple: true,
                        },
                    },
                },
            ],
            throws: {
                matchMessage: 'Missing required arg',
            },
        },
    ]);

    it('exits on help', async () => {
        const output = await runShellCommand(
            `tsx ${interpolationSafeWindowsPath(scriptMockFilePath)} --help`,
            {
                cwd: repoDirPath,
            },
        );

        const stdout = removeColor(output.stdout.toLowerCase());

        assert.strictEquals(output.exitCode, 0);
        assert.isIn(`name\n    ${basename(scriptMockFilePath)}`, stdout);
        assert.isNotIn('{ args: {} }'.toLowerCase(), stdout);
    });

    it('can disable help', async () => {
        const output = await runShellCommand(
            `tsx ${interpolationSafeWindowsPath(scriptMockFilePath)} --help --no-help`,
            {
                cwd: repoDirPath,
            },
        );

        const stdout = removeColor(output.stdout.toLowerCase());

        assert.strictEquals(output.exitCode, 0);
        assert.isNotIn(`name`, stdout);
        assert.isIn('{ args: {} }'.toLowerCase(), stdout);
    });

    it('skips help if already defined', async () => {
        const output = await runShellCommand(
            `tsx ${interpolationSafeWindowsPath(scriptMockFilePath)} --insert-help`,
            {
                cwd: repoDirPath,
            },
        );

        const stdout = removeColor(output.stdout.toLowerCase());

        assert.strictEquals(output.exitCode, 0);
        assert.isNotIn(`name`, stdout);
        assert.isIn('{ args: { help: false } }'.toLowerCase(), stdout);
    });

    it('parseArgs emits help on error (coverage for help branch)', () => {
        assert.throws(() =>
            parseArgs(
                [
                    '--unknownFlag',
                ],
                {
                    known: {flag: true},
                },
                {
                    binName: 'bin-name',
                    importMeta: import.meta,
                },
            ),
        );
    });

    it('throws on invalid argument definition (coverage unreachable assert)', () => {
        assert.throws(() =>
            parseArgs(
                [],
                {
                    // @ts-expect-error: intentionally invalid to reach assert.never branch
                    invalidDef: {notFlag: true},
                },
                {
                    binName: undefined,
                    importMeta: import.meta,
                },
            ),
        );
    });
});
