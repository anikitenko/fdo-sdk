import path from 'node:path';
import { readExampleMetadata } from '../scripts/lib/verify-example-metadata.mjs';
import { validatePluginMetadata } from '../src';

const examples = readExampleMetadata(path.resolve('examples'));
describe('packaged example metadata', () => {
    test.each(examples)('$file is accepted by the SDK metadata validator', ({ metadata }) => {
        expect(() => validatePluginMetadata(metadata)).not.toThrow();
    });
    test('HostsManager uses the supported BlueprintJS v6 network icon', () => {
        const hosts = examples.find(entry => entry.file === '11-hosts-manager-plugin/index.ts');
        expect(hosts?.metadata.icon).toBe('globe-network');
    });
});
