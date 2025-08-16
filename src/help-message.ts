import {check} from '@augment-vir/assert';
import {
    camelCaseToKebabCase,
    ensureErrorAndPrependMessage,
    extractErrorMessage,
    getObjectTypedEntries,
    getObjectTypedValues,
    removeDuplicates,
    stringify,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {basename} from 'node:path';
import {
    ArgValueType,
    FlagRequirement,
    type AllowedArgType,
    type ArgDefinitions,
    type FlagArgDefinition,
    type PositionArgDefinition,
} from './arg-definition.js';
import {UnexpectedInternalError} from './errors/unexpected-internal.error.js';
import {type ParseArgsParams} from './parse-args-params.js';

/**
 * Generates a help message for given argument definitions.
 *
 * @category Internal
 */
export function generateHelpMessage(
    args: ArgDefinitions,
    {
        binName,
        commandDescription,
        importMeta,
    }: PartialWithUndefined<
        Pick<ParseArgsParams, 'binName' | 'importMeta' | 'commandDescription'>
    > = {},
): string {
    try {
        const commandName = binName || (importMeta && basename(importMeta.filename)) || '';

        const expanded = expandArgDefinitionsForHelp(args);

        const sections: string[] = [];

        const renderedName = renderName(commandName);
        if (renderedName) {
            sections.push(renderedName);
        }
        sections.push(renderSynopsis(commandName, expanded.position, expanded.flag));

        if (commandDescription) {
            sections.push(renderDescription(commandDescription));
        }

        if (expanded.position.length) {
            sections.push(renderPositionals(expanded.position));
        }
        if (Object.keys(expanded.flag).length) {
            sections.push(renderOptions(expanded.flag));
        }

        return sections.filter(check.isTruthy).join('\n\n') + '\n';
    } catch (error) {
        throw new UnexpectedInternalError(
            extractErrorMessage(ensureErrorAndPrependMessage(error, 'Help message failed')),
            {cause: error},
        );
    }
}

function renderDescription(description: string): string {
    const lines = description.split(/\r?\n/).map((line) => '    ' + line.trimEnd());
    return `DESCRIPTION\n${lines.join('\n')}`;
}

type ExpandedForHelp = {
    position: (PositionArgDefinition & {argName: string})[];
    flag: Record<
        string,
        FlagArgDefinition & {
            argName: string;
            aliases: string[];
        }
    >;
};

function expandArgDefinitionsForHelp(args: ArgDefinitions): ExpandedForHelp {
    const position: ExpandedForHelp['position'] = [];
    const flag: ExpandedForHelp['flag'] = {};

    getObjectTypedEntries(args).forEach(
        ([
            rawArgName,
            argDefinition,
        ]) => {
            const argName = rawArgName.replace(/^-+/, '');

            if (argDefinition.flag) {
                const flagOptions = check.isObject(argDefinition.flag) ? argDefinition.flag : {};
                flag[argName] = {
                    ...argDefinition,
                    argName,
                    aliases: flagOptions.aliases || [],
                };
            } else {
                position.push({...argDefinition, argName});
                position.sort((a, b) => {
                    const aIndex =
                        check.isObject(a.position) && 'rest' in a.position
                            ? Number.POSITIVE_INFINITY
                            : check.isObject(a.position)
                              ? a.position.index
                              : a.position;
                    const bIndex =
                        check.isObject(b.position) && 'rest' in b.position
                            ? Number.POSITIVE_INFINITY
                            : check.isObject(b.position)
                              ? b.position.index
                              : b.position;
                    return aIndex - bIndex;
                });
            }
        },
    );

    return {position, flag};
}

function cleanArgName(argName: string): string {
    return camelCaseToKebabCase(argName).replaceAll('_', '-');
}

function renderName(binName: string): string {
    if (binName) {
        return `NAME\n    ${binName}`;
    } else {
        return '';
    }
}

function renderSynopsis(
    binName: string,
    positionals: ExpandedForHelp['position'],
    flags: ExpandedForHelp['flag'],
): string {
    const posPart = positionals.map((pos) => formatPositionalSynopsis(pos)).join(' ');
    const flagPart = Object.keys(flags).length ? '[options]' : '';
    const parts = [
        binName,
        flagPart,
        posPart,
    ]
        .filter(check.isTruthy)
        .join(' ');
    return `SYNOPSIS\n    ${parts}`.trimEnd();
}

function formatPositionalSynopsis(pos: PositionArgDefinition & {argName: string}): string {
    const isRest = check.isObject(pos.position) && 'rest' in pos.position;
    const required = !!pos.required && !isRest;
    const tokenBase = `<${camelCaseToKebabCase(pos.argName)}${isRest ? '...' : ''}>`;
    return required ? tokenBase : `[${tokenBase}]`;
}

function renderPositionals(positionals: ExpandedForHelp['position']): string {
    let includeFlagsNoteAdded = false;
    const lines = positionals.map((pos) => {
        const name = camelCaseToKebabCase(pos.argName);
        const type = describeAllowedType(pos.type);
        const req = pos.required ? 'required' : 'optional';
        const isRest = check.isObject(pos.position) && 'rest' in pos.position;
        const metaBits = [
            req,
            'type: ' + type,
        ];
        if (isRest) {
            metaBits.push('rest');
        }
        const metaPortion = '(' + metaBits.join('; ') + ')';
        const descBits = [
            pos.description,
            metaPortion,
        ].filter(check.isTruthy);
        if (!includeFlagsNoteAdded && check.isObject(pos.position) && pos.position.disableFlags) {
            descBits.push(
                'Stops option parsing; all following arguments are treated as positional.',
            );
            includeFlagsNoteAdded = true;
        }
        const displayName = `<${name}${isRest ? '...' : ''}>`;
        return formatColumns(displayName, descBits.join(' '));
    });
    return `POSITIONAL ARGUMENTS\n${lines.join('\n')}`;
}

function renderOptions(flags: ExpandedForHelp['flag']): string {
    const flagDefinitions = getObjectTypedValues(flags).sort((a, b) =>
        a.argName.localeCompare(b.argName),
    );

    const lines = flagDefinitions.map((flagDefinition) => {
        const aliases = removeDuplicates([
            cleanArgName(flagDefinition.argName),
            ...flagDefinition.aliases,
        ]).map((alias) =>
            [
                alias.length === 1 ? '-' : '--',
                alias,
            ].join(''),
        );
        const name = aliases.join(', ');
        const valuePart = formatValuePart(flagDefinition);
        const meta: string[] = [];
        if (flagDefinition.required) {
            meta.push('required');
        }
        if (check.isObject(flagDefinition.flag) && flagDefinition.flag.allowMultiple) {
            meta.push('repeatable');
        }
        const typeDescription = describeAllowedType(flagDefinition.type);
        if (
            check.isObject(flagDefinition.flag) &&
            flagDefinition.flag.valueRequirement !== FlagRequirement.Blocked &&
            typeDescription &&
            !check.hasValue(
                [
                    ArgValueType.Boolean,
                    ArgValueType.String,
                ],
                flagDefinition.type,
            )
        ) {
            meta.push(`type: ${typeDescription}`);
        }
        if (
            check.isObject(flagDefinition.flag) &&
            flagDefinition.flag.valueRequirement === FlagRequirement.Blocked
        ) {
            /** No value. */
        } else if (
            check.isObject(flagDefinition.flag) &&
            flagDefinition.flag.valueRequirement === FlagRequirement.Required
        ) {
            meta.push('value required');
        } else if (
            check.isObject(flagDefinition.flag) &&
            flagDefinition.flag.valueRequirement === FlagRequirement.Optional
        ) {
            meta.push('value optional');
        }
        const metaString = meta.length ? ` (${meta.join('; ')})` : '';
        const descBits = [
            flagDefinition.description,
            metaString,
        ]
            .filter(check.isTruthy)
            .join(' ');
        return formatColumns(name + valuePart, descBits);
    });
    const note =
        '(All option keys are case-insensitive; snake_case, camelCase, and kebab-case variants are accepted.)';
    return `OPTIONS\n    ${note}\n\n${lines.join('\n')}`;
}

function formatValuePart(flagDef: FlagArgDefinition & {argName: string}): string {
    if (check.isObject(flagDef.flag) && flagDef.flag.valueRequirement === FlagRequirement.Blocked) {
        return '';
    }
    const typeLabel = describePrimitiveType(flagDef.type);
    const placeholder = `<${typeLabel}>`;
    if (
        check.isObject(flagDef.flag) &&
        flagDef.flag.valueRequirement === FlagRequirement.Required
    ) {
        return ' ' + placeholder;
    } else {
        return ' [' + placeholder + ']';
    }
}

function describePrimitiveType(type: AllowedArgType | undefined): string {
    if (!type || type === ArgValueType.String) {
        return 'string';
    } else if (type === ArgValueType.Number) {
        return 'number';
    } else if (type === ArgValueType.Boolean) {
        return 'boolean';
    } else if (check.isArray(type) || check.isObject(type)) {
        return 'value';
    } else {
        throw new TypeError(`Unexpected arg value type: ${stringify(type)}`);
    }
}

function describeAllowedType(type: AllowedArgType | undefined): string {
    if (!type || type === ArgValueType.String) {
        return 'string';
    } else if (type === ArgValueType.Number) {
        return 'number';
    } else if (type === ArgValueType.Boolean) {
        return 'boolean';
    } else if (check.isArray(type)) {
        return type.map(String).join('|');
    } else if (check.isObject(type)) {
        return Object.values(type).map(String).join('|');
    } else {
        throw new TypeError(`Unexpected arg value type: ${stringify(type)}`);
    }
}

function formatColumns(left: string, right: string): string {
    /** Typical man page left column width. */
    const padWidth = 28;
    if (!right) {
        return '    ' + left;
    }
    if (left.length >= padWidth - 2) {
        /** Put description on next line. */
        return '    ' + left + '\n' + ' '.repeat(padWidth) + right.trim();
    }
    const padding = ' '.repeat(padWidth - left.length);
    return '    ' + left + padding + right.trim();
}
