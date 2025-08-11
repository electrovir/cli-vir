import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {sanitizeFlagName, type ArgValueType, type MapArgValueType} from './arg-definition.js';

describe('MapArgValueType', () => {
    it('extracts the type', () => {
        assert.tsType<MapArgValueType['string']>().equals<string>();
        assert.tsType<MapArgValueType[ArgValueType.String]>().equals<string>();

        assert.tsType<MapArgValueType['boolean']>().equals<boolean>();
        assert.tsType<MapArgValueType[ArgValueType.Boolean]>().equals<boolean>();

        assert.tsType<MapArgValueType['number']>().equals<number>();
        assert.tsType<MapArgValueType[ArgValueType.Number]>().equals<number>();
    });
});

describe(sanitizeFlagName.name, () => {
    itCases(sanitizeFlagName, [
        {
            it: 'ignores a name without dashes',
            input: 'hi',
            expect: 'hi',
        },
        {
            it: 'removes a single dash',
            input: '-hi',
            expect: 'hi',
        },
        {
            it: 'removes double dashes',
            input: '--hi',
            expect: 'hi',
        },
        {
            it: 'removes lots of dashes',
            input: '----------------hi',
            expect: 'hi',
        },
    ]);
});
