/* node:coverage disable: this is just types */

import {type PartialWithUndefined} from '@augment-vir/common';
import {parseArgs} from './parse-args.js';

/**
 * Params for {@link parseArgs}.
 *
 * @category Internal
 */
export type ParseArgsParams = Readonly<{
    /** The bin name of your npm package, if it exists. For example, `virmator`, `vite`, or `npm`. */
    binName: string | undefined;
    /**
     * The `import.meta` from the original JavaScript / TypeScript file entry point. This _must_ be
     * passed from the original point script or it won't work.
     */
    importMeta: Readonly<Pick<ImportMeta, 'filename'>>;
}> &
    PartialWithUndefined<{
        /**
         * If set to `true`, the automatic `--help` flag is disabled. The help message will still be
         * printed on invalid input, control that is the `noFailureHelp` parameter.
         *
         * @default false
         */
        disableHelp: boolean;
        /** An overall description for the command. Used in the generated help message. */
        commandDescription: string;
        /**
         * If set to `true`, will not error out when encountering unexpected arguments.
         *
         * @default false
         */
        allowUnexpectedArgs: boolean;
        /**
         * If set to `true`, help messages are not printed on error.
         *
         * @default false
         */
        disableFailureHelp: boolean;
    }>;
