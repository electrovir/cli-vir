import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {type WithUnion} from './parsed-arg-definition.js';

describe('WithUnion', () => {
    it('does not add a union', () => {
        assert.tsType<WithUnion<false | true, string, number>>().equals<number>();
        assert.tsType<WithUnion<false, string, number>>().equals<number>();
    });
    it('adds a union', () => {
        // eslint-disable-next-line sonarjs/no-duplicate-in-composite
        assert.tsType<WithUnion<true | true, string, number>>().equals<string | number>();
        assert.tsType<WithUnion<true, string, number>>().equals<string | number>();
    });
});
