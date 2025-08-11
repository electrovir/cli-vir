import {type AnyObject, type InverseBoolean, type Values} from '@augment-vir/common';
import {type IsNever} from 'type-fest';
import {
    sanitizeFlagName,
    type ArgDefinition,
    type ArgDefinitions,
    type ArgValueType,
    type FlagArgOptions,
    type FlagRequirement,
    type MapArgValueType,
    type PositionArgOptions,
} from './arg-definition.js';

/**
 * Optionally adds a union.
 *
 * @category Internal
 */
export type WithUnion<ShouldAdd extends boolean | undefined, ExtraType, Original> =
    IsNever<Exclude<ShouldAdd, true>> extends true ? Original | ExtraType : Original;

/**
 * Sets `Fallback` if `Original` is `undefined`.
 *
 * @category Internal
 */
export type WithFallback<Original, Fallback> = undefined extends Original ? Fallback : Original;
/**
 * Optionally wraps `T` in an array.
 *
 * @category Internal
 */
export type WithArray<T, ShouldUseArray extends boolean | undefined> = ShouldUseArray extends true
    ? T[]
    : T;

/**
 * Extracts arg types for a potential flag arg.
 *
 * @category Internal
 */
export type ExtractArgTypeWithFlag<Arg extends ArgDefinition> = Arg extends {
    flag: FlagArgOptions;
}
    ? Arg['flag']['valueRequirement'] extends `${FlagRequirement.Blocked}`
        ? boolean
        : Arg['flag']['valueRequirement'] extends `${FlagRequirement.Required}`
          ? ExtractArgType<Arg>
          : ExtractIfMultiple<Arg> extends true
            ? ExtractArgType<Arg> | true
            : Arg['required'] extends true
              ? ExtractArgType<Arg> | true
              : ExtractArgType<Arg> | boolean
    : Arg extends {
            flag: true;
        }
      ? Arg['required'] extends true
          ? ExtractArgType<Arg> | true
          : ExtractArgType<Arg> | boolean
      : ExtractArgType<Arg>;

/**
 * Extracts an arg's raw value type.
 *
 * @category Internal
 */
export type ExtractArgType<Arg extends ArgDefinition> = Arg['type'] extends
    | ArgValueType
    | `${ArgValueType}`
    ? MapArgValueType[Arg['type']]
    : undefined extends Arg['type']
      ? MapArgValueType[ArgValueType.String]
      : Arg['type'] extends ReadonlyArray<infer InnerValue>
        ? InnerValue
        : Values<Arg['type']>;

/**
 * Determines if the arg definition supports multiple values.
 *
 * @category Internal
 */
export type ExtractIfMultiple<Arg extends ArgDefinition> = Arg extends {flag: FlagArgOptions}
    ? Arg['flag']['allowMultiple']
    : false;

/**
 * Determines if a positional arg is a rest arg.
 *
 * @category Internal
 */
export type ExtractIfRest<Arg extends ArgDefinition> = Arg extends {position: PositionArgOptions}
    ? PositionArgOptions extends Arg['position']
        ? Arg['position'] extends {rest: true}
            ? true
            : false
        : false
    : false;

/**
 * Removes the dashes from an argument name. See {@link sanitizeFlagName} for the run-time
 * equivalent.
 *
 * @category Internal
 */
export type RemoveArgDashes<Key extends PropertyKey> = Key extends `-${infer Rest}`
    ? RemoveArgDashes<Rest>
    : Key;

/**
 * Converts all arg definitions into their parsed types.
 *
 * @category Internal
 */
export type ParsedArg<Args extends ArgDefinitions> = {
    [Key in RemoveArgDashes<keyof Args>]: WithUnion<
        InverseBoolean<Args[Key]['required']> | InverseBoolean<ExtractIfMultiple<Args[Key]>>,
        Args[Key] extends {flag: true | AnyObject} ? false : undefined,
        WithArray<
            ExtractArgTypeWithFlag<Args[Key]>,
            ExtractIfMultiple<Args[Key]> extends true
                ? true
                : ExtractIfRest<Args[Key]> extends true
                  ? true
                  : false
        >
    >;
};
