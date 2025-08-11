/**
 * An error thrown when a user provided argument does match the argument definitions.
 *
 * @category Error
 */
export class InvalidArgError extends Error {
    public override readonly name = 'InvalidArgError';
}
