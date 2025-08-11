import {describe, it} from '@augment-vir/test';

describe('exports', () => {
    it('can be imported', async () => {
        await import('./index.js');
    });
});
