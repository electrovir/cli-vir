import {type PartialWithUndefined} from '@augment-vir/common';
import {type RequireExactlyOne} from 'type-fest';

/**
 * Value requirements for flag arguments.
 *
 * @category Arg Definition
 */
export enum FlagRequirement {
    /** This flag must have a value or parsing fails. */
    Required = 'required',
    /** This flag is allowed to have a value but it is not required. */
    Optional = 'optional',
    /** This flag must not have a value or its parsing fails. */
    Blocked = 'blocked',
}

/**
 * Options for a flag arg definition.
 *
 * @category Arg Definition
 */
export type FlagArgOptions = PartialWithUndefined<{
    /**
     * How values for this flag should be treated.
     *
     * @default FlagArgDefinitionValue.Optional
     */
    valueRequirement: FlagRequirement | `${FlagRequirement}`;
    /** Other possible arg flag names that will map to this one. */
    aliases: string[];
    /**
     * If `true`, allows this flag to be set multiple times. Otherwise, the flag can only be set
     * once.
     *
     * @default false
     */
    allowMultiple: boolean;
}>;

/**
 * Options for a positional arg definition.
 *
 * @category Arg Definition
 */
export type PositionArgOptions = PartialWithUndefined<{
    /**
     * Setting this to `true` will turn off all flag argument parsing after this positional
     * argument. It will cause all subsequent flag arguments to be parsed as positional arguments.
     */
    disableFlags: boolean;
}> &
    RequireExactlyOne<{
        /** The index for this arg's position. */
        index: number;
        /** Inserts all remaining positional args into this argument. */
        rest: true;
    }>;

/**
 * Accepted primitive arg value types.
 *
 * @category Arg Definition
 */
export enum ArgValueType {
    /**
     * Accepts arg values as-is.
     *
     * This is the default.
     */
    String = 'string',
    /**
     * Setting an arg to type boolean will attempt to coerce a boolean value (with case
     * insensitivity):
     *
     * - `'t'`: true
     * - `'true'`: true
     * - `'1'`: true
     * - `'f'`: false
     * - `'false'`: false
     * - `'0'`: false
     */
    Boolean = 'boolean',
    /** Converts arg inputs into a number. */
    Number = 'number',
}

/**
 * Mapping of {@link ArgValueType} to TypeScript types.
 *
 * @category Internal
 */
export type MapArgValueType = {
    string: string;
    boolean: boolean;
    number: number;
};

/**
 * All allowed types for an arg type.
 *
 * @category Internal
 */
export type AllowedArgType =
    | ArgValueType
    /** Accept the enum as a string so imports aren't necessary (if desired). */
    | `${ArgValueType}`
    /** Accept enums or objects with values. */
    | Record<string, string | number | boolean>
    /** Accept an array of possible values. */
    | (number | string | boolean)[];

/**
 * An individual arg definition.
 *
 * @category Arg Definition
 */
export type ArgDefinition = PartialWithUndefined<{
    /** If this argument is missing, the parsing aborts. If this is `true`, `default` is ignored. */
    required: boolean;
    /** Description for this argument. */
    description: string;
    /**
     * Set the expected value type for this argument. Provide an enum, an object, or an array to
     * restrict the type to values in that enum,array, or object.
     *
     * @default ArgValueType.String
     */
    type: AllowedArgType;
    /**
     * A custom checker that will be run against all values retrieved for this arg. In order to fail
     * a value, throw an error.
     */
    customValueAssertion(value: unknown): void;
}> &
    RequireExactlyOne<{
        /** A flag argument (with a key prefixed by `-` or `--`), optionally with a value. */
        flag: FlagArgOptions | true;
        /** An argument that is positional and has no key. */
        position: PositionArgOptions | number;
    }>;

/**
 * An argument definition for a flag argument.
 *
 * @category Internal
 */
export type FlagArgDefinition = Extract<ArgDefinition, {flag: FlagArgOptions | boolean}>;

/**
 * An argument definition for a positional argument.
 *
 * @category Internal
 */
export type PositionArgDefinition = Extract<ArgDefinition, {position: PositionArgOptions | number}>;

/**
 * All arg definitions.
 *
 * @category Internal
 */
export type ArgDefinitions = Record<string, ArgDefinition>;

/**
 * Sanitizes a flag name by removing all leading dashes. See `RemoveArgDashes` for the type
 * equivalent.
 *
 * @category Internal
 */
export function sanitizeFlagName(rawFlagName: string): string {
    return rawFlagName.replace(/^-+/, '');
}
