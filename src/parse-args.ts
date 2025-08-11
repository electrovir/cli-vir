import {assert, assertWrap, check, checkWrap} from '@augment-vir/assert';
import {
    camelCaseToKebabCase,
    ensureErrorAndPrependMessage,
    extractErrorMessage,
    getObjectTypedEntries,
    getObjectTypedValues,
    getOrSet,
    kebabCaseToCamelCase,
    log,
    mapObjectValues,
    match,
    stringify,
    type MaybeArray,
    type Overwrite,
    type PartialWithUndefined,
    type SetRequiredAndNotNull,
} from '@augment-vir/common';
import {extractRelevantArgs} from '@augment-vir/node';
import {type RequireExactlyOne} from 'type-fest';
import {
    ArgValueType,
    FlagRequirement,
    sanitizeFlagName,
    type AllowedArgType,
    type ArgDefinitions,
    type FlagArgDefinition,
    type FlagArgOptions,
    type PositionArgDefinition,
} from './arg-definition.js';
import {InvalidArgError} from './errors/invalid-arg.error.js';
import {UnexpectedInternalError} from './errors/unexpected-internal.error.js';
import {generateHelpMessage} from './help-message.js';
import {type ParseArgsParams} from './parse-args-params.js';
import {type ParsedArg} from './parsed-arg-definition.js';

/**
 * Parses raw args that have already had the leading command args (like `node` or the script name)
 * removed. In most cases, you should not use this directly. Instead use {@link parseArgs}.
 *
 * @deprecated Prefer {@link parseArgs}.
 * @category Internal
 */
export function parseStrippedArgs(
    /** This is mutated as args are popped off and parsed. */
    relevantArgs: string[],
    argDefinitions: Readonly<ArgDefinitions>,
    params: Readonly<PartialWithUndefined<ParseArgsParams>> = {},
) {
    try {
        const flagArgs: Record<string, MaybeArray<ExpandedFlagArgDefinitionWithValue>> = {};
        /**
         * Positional args keyed by arg name. Normal positionals map directly to a single definition
         * with value, while a rest positional accumulates multiple definitions (to re-use the
         * existing multi-value parsing path shared with multi flags).
         */
        const positionArgs: Record<string, MaybeArray<ExpandedPositionArgDefinitionWithValue>> = {};
        const expandedArgDefinitions = expandArgDefinitions(argDefinitions);

        let rawArg: string | undefined;

        while ((rawArg = relevantArgs.shift())) {
            const parsed = parseArg(rawArg);
            if (parsed.flag) {
                const flagDefinition = findArgDefinition(expandedArgDefinitions, {
                    flagName: parsed.flag.name,
                });

                if (flagDefinition) {
                    const flagValue: string | undefined = getFlagArgValue(
                        parsed,
                        relevantArgs,
                        flagDefinition,
                    );

                    if (flagDefinition.flag.allowMultiple) {
                        const flagArray = checkWrap.isArray(flagArgs[flagDefinition.argName]) || [];

                        if (!check.isArray(flagArgs[flagDefinition.argName])) {
                            flagArgs[flagDefinition.argName] = flagArray;
                        }

                        flagArray.push({
                            ...flagDefinition,
                            /**
                             * If `flagValue` is `undefined`, we at least want to set `true` so we
                             * know that the flag was set (even if it was set without a value).
                             */
                            value: flagValue,
                        });
                    } else {
                        flagArgs[flagDefinition.argName] = {
                            ...flagDefinition,
                            /**
                             * If `flagValue` is `undefined`, we at least want to set `true` so we
                             * know that the flag was set (even if it was set without a value).
                             */
                            value: flagValue,
                        };
                    }
                } else if (!params.allowUnexpectedArgs) {
                    throw new InvalidArgError(`Unexpected flag: ${parsed.flag.rawFlag}`);
                }
            } else {
                const positionIndex = Object.keys(positionArgs).length;

                const positionDefinition = findArgDefinition(expandedArgDefinitions, {
                    positionIndex,
                });
                if (positionDefinition) {
                    if (positionDefinition.isRest) {
                        const existing = getOrSet(
                            positionArgs,
                            positionDefinition.argName,
                            () => [],
                        ) satisfies MaybeArray<ExpandedPositionArgDefinitionWithValue> as ExpandedPositionArgDefinitionWithValue[];
                        const newEntry: ExpandedPositionArgDefinitionWithValue = {
                            ...positionDefinition,
                            value: rawArg,
                        };
                        existing.push(newEntry);
                    } else {
                        positionArgs[positionDefinition.argName] = {
                            ...positionDefinition,
                            value: rawArg,
                        };
                    }
                } else if (!params.allowUnexpectedArgs) {
                    throw new InvalidArgError(
                        `Unexpected positional arg at ${positionIndex}: ${rawArg}`,
                    );
                }
            }
        }

        const parsedArgs: Record<
            string,
            MaybeArray<string | boolean | number | undefined>
        > = mapObjectValues(expandedArgDefinitions.all, (argName, argDefinition) => {
            try {
                const flagArg = flagArgs[argName];
                const positionArg = positionArgs[argName];
                const argDefinitionWithValue = flagArg || positionArg;

                if (argDefinition.flag && !flagArg) {
                    if (argDefinition.flag.allowMultiple) {
                        return [];
                    } else {
                        return false;
                    }
                } else if (argDefinition.position != undefined && !positionArg) {
                    return undefined;
                    /* node:coverage ignore next 3: this shouldn't ever happen. */
                } else if (!argDefinitionWithValue) {
                    assert.never('Failed to find arg definition');
                }

                const value = parseArgValue(argDefinitionWithValue);

                if (flagArg || (positionArg && check.isArray(positionArg))) {
                    if (flagArg && check.isArray(flagArg)) {
                        assert.isArray(value, 'Invalid non-array value for multi flag.');
                        value.forEach((innerValue, index) =>
                            assertValidFlagValue(
                                assertWrap.isDefined(
                                    flagArg[index],
                                    'Failed to find matching arg definition for arg value index.',
                                ),
                                innerValue,
                            ),
                        );
                    } else if (flagArg && !check.isArray(flagArg)) {
                        assert.isNotArray(value, 'Invalid array value for non-multi flag.');
                        assertValidFlagValue(flagArg, value);
                    } else {
                        // rest positional: nothing additional to validate beyond custom assertion below
                    }
                }

                if (check.isArray(value)) {
                    return value.map((innerValue) => {
                        const finalValue = innerValue ?? true;
                        if (argDefinition.customValueAssertion) {
                            argDefinition.customValueAssertion(finalValue);
                        }
                        return finalValue;
                    });
                } else {
                    const finalValue = value ?? true;
                    if (argDefinition.customValueAssertion) {
                        argDefinition.customValueAssertion(finalValue);
                    }
                    return finalValue;
                }
            } catch (error) {
                throw ensureErrorAndPrependMessage(error, `Invalid ${argName} argument`);
            }
        });

        getObjectTypedValues(expandedArgDefinitions.flag).forEach((argDefinition) => {
            const argValue = parsedArgs[argDefinition.argName];
            const singleValue = argDefinition.flag.allowMultiple
                ? undefined
                : assertWrap.isNotArray(
                      argValue,
                      `Arg ${argDefinition.argName} cannot be provided multiple times.`,
                  );
            const valueArray = argDefinition.flag.allowMultiple
                ? assertWrap.isArray(
                      argValue,
                      `Expected multiple values of ${argDefinition.argName}.`,
                  )
                : undefined;

            if (
                argDefinition.required &&
                (valueArray ? !valueArray.filter(check.isTruthy).length : !singleValue)
            ) {
                throw new InvalidArgError(`Missing required arg ${argDefinition.argName}`);
            }
        });

        expandedArgDefinitions.position.forEach((argDefinition) => {
            const argValue = parsedArgs[argDefinition.argName];

            if (argDefinition.required && argValue == undefined) {
                throw new InvalidArgError(`Missing required arg ${argDefinition.argName}`);
            }
        });

        expandedArgDefinitions.position.forEach((argDefinition) => {
            if (argDefinition.isRest && !parsedArgs[argDefinition.argName]) {
                parsedArgs[argDefinition.argName] = [];
            }
        });

        return parsedArgs;
    } catch (error) {
        if (error instanceof InvalidArgError) {
            if (!params.noHelp) {
                process.stdout.write(generateHelpMessage(argDefinitions, params) + '\n');
            }
            log.error(extractErrorMessage(error));

            throw error;
        } else {
            throw new UnexpectedInternalError(
                extractErrorMessage(ensureErrorAndPrependMessage(error, 'Failed to parse args')),
                {cause: error},
            );
        }
    }
}

/**
 * Parses the provided `rawArgs` against the provided `argDefinitions` and returns the value for
 * each arg.
 *
 * @category Main
 * @throws `InvalidArgError` When provided args do not match their definitions
 * @throws `UnexpectedInternalError` When a different, unexpected error is encountered. This
 *   includes errors caused by invalid arg definitions.
 */
export function parseArgs<const Args extends ArgDefinitions>(
    rawArgs: ReadonlyArray<string>,
    argDefinitions: Args,
    params: ParseArgsParams,
): ParsedArg<Args> {
    const relevantArgs = extractRelevantArgs({
        binName: params.binName,
        fileName: params.importMeta.filename,
        rawArgs,
    });

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return parseStrippedArgs(relevantArgs, argDefinitions, params) as ParsedArg<Args>;
}

function assertValidFlagValue(
    argDefinition: ExpandedFlagArgDefinition,
    value: string | boolean | number | undefined,
) {
    if (argDefinition.flag.valueRequirement === FlagRequirement.Blocked && value) {
        throw new InvalidArgError('arg does not allow a value.');
    } else if (
        argDefinition.flag.valueRequirement === FlagRequirement.Required &&
        value == undefined
    ) {
        throw new InvalidArgError('Missing required flag value.');
    }
}

function parseArgValue(
    arg: MaybeArray<ExpandedFlagArgDefinitionWithValue | ExpandedPositionArgDefinitionWithValue>,
): MaybeArray<string | number | boolean | undefined> {
    if (check.isArray(arg)) {
        return arg.flatMap((innerArg) => parseArgValue(innerArg));
    } else {
        const isRequired: boolean = arg.flag
            ? arg.flag.valueRequirement === FlagRequirement.Required
            : false;

        return parseRawValue(arg.value, arg.type, isRequired);
    }
}

function parseRawValue(
    value: string | undefined,
    expectedType: AllowedArgType = ArgValueType.String,
    isRequired: boolean,
): string | number | boolean | undefined {
    if (!value && !isRequired) {
        return undefined;
    }

    const lowercaseValue: string = check.isString(value) ? value.toLowerCase() : '';
    const numericValue = Number(value);
    const booleanValue = [
        't',
        'true',
        '1',
    ].includes(lowercaseValue)
        ? true
        : [
                'f',
                'false',
                '0',
            ].includes(lowercaseValue)
          ? false
          : undefined;
    const possibleValues = check.isArray(expectedType)
        ? expectedType
        : check.isObject(expectedType)
          ? Object.values(expectedType)
          : undefined;

    if (expectedType === ArgValueType.Boolean) {
        if (check.isBoolean(booleanValue)) {
            return booleanValue;
        } else {
            throw new InvalidArgError(`Expected a boolean but got '${value}'`);
        }
    } else if (expectedType === ArgValueType.Number) {
        if (isNaN(numericValue)) {
            throw new InvalidArgError(`Expected a number but got '${value}'`);
        } else {
            return numericValue;
        }
    } else if (expectedType === ArgValueType.String) {
        return value;
    } else if (possibleValues) {
        if (possibleValues.includes(String(value))) {
            return value;
        } else if (check.isNumber(numericValue) && possibleValues.includes(numericValue)) {
            return numericValue;
        } else {
            throw new InvalidArgError(`Expected one of ${possibleValues.join(', ')}`);
        }
    } else {
        throw new InvalidArgError(`Invalid expected arg value type: '${stringify(expectedType)}'`);
    }
}

function getFlagArgValue(
    parsedArg: SetRequiredAndNotNull<ParsedArgString, 'flag'>,
    relevantArgs: string[],
    argDefinition: ExpandedFlagArgDefinition,
) {
    if (parsedArg.value) {
        return parsedArg.value;
    }

    let nextArg: string | undefined;

    while ((nextArg = relevantArgs[0])) {
        if (
            !nextArg ||
            nextArg.startsWith('-') ||
            argDefinition.flag.valueRequirement === FlagRequirement.Blocked
        ) {
            return undefined;
        }

        relevantArgs.shift();

        if (nextArg.trim() !== '=') {
            return nextArg;
        }
    }

    return nextArg;
}

type ExpandedPositionArgDefinition = PositionArgDefinition & {argName: string; isRest: boolean};
type ExpandedFlagArgDefinition = Overwrite<
    FlagArgDefinition,
    {
        flag: FlagArgOptions;
    }
> & {argName: string};

type ExpandedPositionArgDefinitionWithValue = ExpandedPositionArgDefinition & {value: string};
type ExpandedFlagArgDefinitionWithValue = ExpandedFlagArgDefinition & {
    value: string | undefined;
};

type ExpandedArgDefinitions = {
    position: ExpandedPositionArgDefinition[];
    flag: Record<string, ExpandedFlagArgDefinition>;
    all: Record<string, ExpandedFlagArgDefinition | ExpandedPositionArgDefinition>;
};

function expandFlagNames(argName: string): string[] {
    return [
        camelCaseToKebabCase(argName),
        camelCaseToKebabCase(argName).replaceAll('-', '_'),
        kebabCaseToCamelCase(argName.replaceAll('_', '-')),
    ].filter((value) => value !== argName);
}

function expandArgDefinitions(argDefinitions: Readonly<ArgDefinitions>): ExpandedArgDefinitions {
    const positionArgDefinitions: ExpandedArgDefinitions['position'] = [];
    const flagArgDefinitions: ExpandedArgDefinitions['flag'] = {};
    const allArgDefinitions: ExpandedArgDefinitions['all'] = {};
    let restDefinition: ExpandedPositionArgDefinition | undefined;

    getObjectTypedEntries(argDefinitions).forEach(
        ([
            rawArgName,
            argDefinition,
        ]) => {
            const argName = sanitizeFlagName(rawArgName);

            if (argDefinition.flag) {
                const flagOptions: FlagArgOptions =
                    checkWrap.isNotBoolean(argDefinition.flag) || {};

                const expandedArgDefinition = {
                    ...argDefinition,
                    argName,
                    flag: {
                        ...flagOptions,
                        aliases: [
                            ...(flagOptions.aliases || []),
                            ...expandFlagNames(argName),
                        ],
                    },
                };

                flagArgDefinitions[argName] = expandedArgDefinition;
                allArgDefinitions[argName] = expandedArgDefinition;
            } else if ('position' in argDefinition) {
                const isRest: boolean =
                    check.isObject(argDefinition.position) && !!argDefinition.position.rest;

                const expandedArgDefinition: ExpandedPositionArgDefinition = {
                    ...argDefinition,
                    argName,
                    isRest,
                };

                if (isRest) {
                    if (restDefinition) {
                        throw new Error('Only one rest positional argument is allowed.');
                    }
                    restDefinition = expandedArgDefinition;
                } else {
                    const index = check.isObject(argDefinition.position)
                        ? argDefinition.position.index
                        : argDefinition.position;
                    assert.isDefined(index, 'Failed to find position index.');
                    positionArgDefinitions.splice(
                        assertWrap.isDefined(index),
                        0,
                        expandedArgDefinition,
                    );
                }
                allArgDefinitions[argName] = expandedArgDefinition;
            } else {
                /* node:coverage ignore next 3: impossible by type constraints */
                assert.never(
                    `Invalid argument definition '${argName}': no position or flag property.`,
                );
            }
        },
    );

    if (restDefinition) {
        positionArgDefinitions.push(restDefinition);
    }

    return {
        flag: flagArgDefinitions,
        position: positionArgDefinitions,
        all: allArgDefinitions,
    };
}

type FoundArgDefinition<
    Params extends RequireExactlyOne<{
        flagName: string;
        positionIndex: number;
    }>,
> =
    | (Params extends {flagName: string}
          ? ExpandedFlagArgDefinition
          : ExpandedPositionArgDefinition)
    | undefined;

function findArgDefinition<
    const Params extends RequireExactlyOne<{
        flagName: string;
        positionIndex: number;
    }>,
>(
    expandedArgDefinitions: Readonly<ExpandedArgDefinitions>,
    params: Params,
): FoundArgDefinition<Params> {
    if (params.flagName) {
        return getObjectTypedValues(expandedArgDefinitions.flag).find((argDefinition) => {
            return (
                match(argDefinition.argName, params.flagName) ||
                argDefinition.flag.aliases?.some((alias) => match(alias, params.flagName))
            );
        }) satisfies ExpandedFlagArgDefinition | undefined as FoundArgDefinition<Params>;
        /* node:coverage ignore next 3: this shouldn't actually happen */
    } else if (params.positionIndex == undefined) {
        assert.never('Missing flagName or positionIndex params.');
    } else {
        const direct = expandedArgDefinitions.position[params.positionIndex];
        if (direct) {
            return direct satisfies ExpandedPositionArgDefinition as FoundArgDefinition<Params>;
        }
        const lastArgDefinition =
            expandedArgDefinitions.position[expandedArgDefinitions.position.length - 1];
        if (lastArgDefinition && lastArgDefinition.isRest) {
            return lastArgDefinition satisfies ExpandedPositionArgDefinition as FoundArgDefinition<Params>;
        }
        return undefined;
    }
}

type ParsedArgString =
    | {
          value: string | undefined;
          flag: {
              name: string;
              rawFlag: string;
          };
      }
    | {
          value: string | undefined;
          flag?: undefined;
      };

function parseArg(arg: string): ParsedArgString {
    if (arg.startsWith('-')) {
        const [
            rawFlag = '',
            flagValue,
        ] = arg.split('=', 2);

        return {
            flag: {
                name: sanitizeFlagName(rawFlag.trim()),
                rawFlag,
            },
            value: flagValue,
        };
    } else {
        return {
            value: arg,
        };
    }
}
