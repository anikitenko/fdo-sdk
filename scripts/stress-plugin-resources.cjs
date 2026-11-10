#!/usr/bin/env node
// Build first. The launcher gives each worker a low FD limit on POSIX systems.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {setTimeout: delay} = require('node:timers/promises');

const duration = Number(process.env.FDO_STRESS_DURATION_MS || 6000);
assert(Number.isFinite(duration) && duration >= 1000, 'FDO_STRESS_DURATION_MS must be at least 1000');

if (!process.argv.includes('--worker')) {
    // Separate worker processes exercise the same resource boundary as FDO unload/reload.
    for (let session = 0; session < 3; session++) {
        const args = ['--expose-gc', __filename, '--worker'];
        const env = {...process.env, FDO_STRESS_DURATION_MS: String(Math.max(1000, Math.floor(duration / 3)))};
        const result = process.platform === 'win32'
            ? spawnSync(process.execPath, args, {env, stdio: 'inherit', timeout: duration + 30000})
            : spawnSync('/bin/sh', ['-c', 'ulimit -n 128 || exit 1; exec "$@"', 'fdo-resource-stress', process.execPath, ...args],
                {env, stdio: 'inherit', timeout: duration + 30000});
        if (result.error) throw result.error;
        assert.equal(result.status, 0, `worker session ${session + 1} failed (${result.signal || result.status})`);
    }
    console.log('Resource stress passed: 3 worker sessions; POSIX file-descriptor limit 128.');
} else {
    void runWorker().catch(error => { console.error(error); process.exitCode = 1; });
}

async function runWorker() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fdo-resource-stress-'));
    process.env.FDO_SDK_LOG_ROOT = path.join(root, 'logs');
    const openStreams = new Set();
    const createWriteStream = fs.createWriteStream;
    let peakStreams = 0;
    fs.createWriteStream = function (...args) {
        const stream = createWriteStream.apply(this, args);
        openStreams.add(stream);
        peakStreams = Math.max(peakStreams, openStreams.size);
        stream.once('close', () => openStreams.delete(stream));
        return stream;
    };
    process.parentPort = {on() {}, postMessage() {}};
    const {FDO_SDK, PluginRegistry} = require('../dist/fdo-sdk.bundle.js');
    class StressPlugin extends FDO_SDK {
        get metadata() { return {id: 'resource-stress', name: 'Resource stress', version: '1.0.0', author: 'SDK', description: 'Stress fixture', icon: 'cog'}; }
        init() {}
        render() { return '<p>resource stress</p>'; }
    }
    let plugin;
    PluginRegistry.configureCapabilities({granted: ['storage', 'storage.json']});
    PluginRegistry.configureStorage({rootDir: path.join(root, 'storage')});
    const countDescriptors = () => {
        try { return fs.readdirSync(process.platform === 'linux' ? '/proc/self/fd' : '/dev/fd').filter(name => /^\d+$/.test(name)).length; }
        catch { return null; }
    };
    let cycles = 0;
    let requests = 0;
    let baseline;
    let peakDescriptors = 0;
    let baselineHeap;
    let peakHeap = 0;
    let baselineLoggerFamilies;
    const end = Date.now() + duration;
    try {
        do {
            plugin = new StressPlugin();
            plugin.lifecycle.interval(() => {}, 1000);
            PluginRegistry.callInit();
            const store = PluginRegistry.useStore('json');
            PluginRegistry.registerHandler('tick', value => { store.set('value', value); return value; });
            for (let batch = 0; batch < 10; batch++) {
                for (let i = 0; i < 50; i++) {
                    PluginRegistry.callRenderer();
                    await PluginRegistry.callHandler('tick', ++requests);
                    // Enough output to exercise size rotation repeatedly.
                    plugin.info('stress ' + 'x'.repeat(1024));
                }
                await store.flush();
                assert(store.getWriteDiagnostics().pendingWrites <= 2);
            }
            await PluginRegistry.shutdown();
            PluginRegistry.clearAllHandlers();
            assert.throws(() => store.set('late', true), /disposed/);
            const persisted = JSON.parse(fs.readFileSync(path.join(root, 'storage', 'resource-stress', 'store.json'), 'utf8'));
            assert.equal(persisted.value, requests);
            await delay(25); // Let replaced rotation streams finish closing before sampling.
            global.gc?.();
            const heap = process.memoryUsage().heapUsed;
            if (baselineHeap === undefined) baselineHeap = heap;
            peakHeap = Math.max(peakHeap, heap);
            assert(heap <= baselineHeap + 8 * 1024 * 1024, `retained heap growth: ${heap - baselineHeap}`);
            const diagnostics = PluginRegistry.getDiagnostics().resources;
            if (baselineLoggerFamilies === undefined) baselineLoggerFamilies = diagnostics.logging.activeFamilies;
            assert.equal(diagnostics.logging.activeFamilies, baselineLoggerFamilies, 'logger families leaked across unload');
            assert.equal(diagnostics.storage.activeStores, 1, 'only the legacy singleton may remain after unload');
            assert.equal(diagnostics.storage.pendingWrites, 0);
            assert.equal(diagnostics.logging.stderrFallbacks, 0, 'FD pressure must not force logging into fallback');
            assert.equal(diagnostics.storage.writeFailures, 0);
            const descriptors = countDescriptors();
            if (baseline === undefined) baseline = descriptors;
            if (descriptors !== null) {
                peakDescriptors = Math.max(peakDescriptors, descriptors);
                assert(descriptors <= baseline + 4, `FD growth: baseline ${baseline}, current ${descriptors}`);
            }
            cycles++;
        } while (Date.now() < end || cycles < 3);
        assert(peakStreams < 32, `unbounded file streams: ${peakStreams}`);
        assert(fs.readdirSync(path.join(root, 'logs')).some(name => /\.log\.\d+$/.test(name)), 'size rotation was not exercised');
        console.log(JSON.stringify({cycles, requests, baselineDescriptors: baseline, peakDescriptors, peakStreams, baselineHeap, peakHeap}));
    } finally {
        await PluginRegistry.clearAllStoreInstances();
        // Remaining process-wide SDK loggers are released by this worker's exit,
        // exactly as when FDO terminates an unloaded utility process.
        fs.createWriteStream = createWriteStream;
        fs.rmSync(root, {recursive: true, force: true});
    }
}
