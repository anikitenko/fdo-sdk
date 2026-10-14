import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

/** CDP over pipes avoids ports, browser packages and access to a user's Chrome profile. */
export async function verifyBrowserOverlays(markup, onLoad, componentChecks) {
    const candidates = [process.env.FDO_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
    const executable = candidates.find(file => file && fs.existsSync(file));
    if (!executable) throw Error('Real-browser release gate requires Chrome/Chromium. Set FDO_CHROME_PATH.');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fdo-chrome-'));
    const chrome = spawn(executable, ['--headless=new', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--user-data-dir=${profile}`], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
    let sequence = 0, buffer = '', stderr = '';
    const pending = new Map();
    chrome.stderr.on('data', data => { stderr = (stderr + data).slice(-3000); });
    const failPending = error => { for (const item of pending.values()) { clearTimeout(item.timeout); item.reject(error); } pending.clear(); };
    chrome.on('error', failPending);
    chrome.on('exit', code => failPending(Error(`Chrome exited (${code}): ${stderr}`)));
    const cdpInput = /** @type {import('node:stream').Writable} */ (chrome.stdio[3]);
    const cdpOutput = /** @type {import('node:stream').Readable} */ (chrome.stdio[4]);
    cdpOutput.on('data', data => {
        buffer += data.toString();
        let boundary;
        while ((boundary = buffer.indexOf('\0')) >= 0) {
            const message = JSON.parse(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 1);
            const item = pending.get(message.id);
            if (!item) continue;
            pending.delete(message.id);
            clearTimeout(item.timeout);
            if (message.error) item.reject(Error(JSON.stringify(message.error)));
            else item.resolve(message.result);
        }
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
        const id = ++sequence;
        const timeout = setTimeout(() => { pending.delete(id); reject(Error(`Chrome timed out: ${method}: ${stderr}`)); }, 15000);
        pending.set(id, { resolve, reject, timeout });
        cdpInput.write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
    });
    let checks = 0;
    try {
        const browser = await send('Browser.getVersion');
        console.log(`Browser gate: ${browser.product}`);
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
        await send('Page.enable', {}, sessionId);
        await send('Page.navigate', { url: 'data:text/html,<!doctype html><html lang="en"><head><title>SDK overlay release fixture</title></head><body></body></html>' }, sessionId);
        const evaluate = async expression => {
            const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
            if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
            return result.result.value;
        };
        const check = async (expression, message) => {
            if (!await evaluate(expression)) {
                const state = await evaluate(`JSON.stringify({ active: document.activeElement?.id, open: document.getElementById('native-dialog')?.open, cancelCount: window.__cancelCount, diagnostics: window.__diagnostics, anchorControls:document.getElementById('anchor')?.getAttribute('aria-controls'), anchorExpanded:document.getElementById('anchor')?.getAttribute('aria-expanded'), popoverStyle:document.getElementById('p')?.getAttribute('style') })`);
                throw Error(`Browser regression: ${message}: ${state}`);
            }
            checks++;
        };
        const accessible = async (role, name) => {
            const { nodes } = await send('Accessibility.getFullAXTree', {}, sessionId);
            if (!nodes.some(node => !node.ignored && node.role?.value === role && node.name?.value === name)) throw Error(`Missing accessible ${role} named ${name}: ${JSON.stringify(nodes.filter(node => !node.ignored).map(node => [node.role?.value, node.name?.value]).slice(0, 40))}`);
            checks++;
        };
        const settle = () => evaluate('new Promise(resolve => setTimeout(resolve, 40))');
        const click = async id => {
            const point = await evaluate(`(() => { const r = document.getElementById(${JSON.stringify(id)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
            await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 }, sessionId);
            await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 }, sessionId);
            await settle();
        };
        const key = async (key, modifiers = 0) => {
            const code = key === 'Escape' ? 27 : 9;
            await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers }, sessionId);
            await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers }, sessionId);
            await settle();
        };
        await evaluate(`new Promise(resolve => { if (document.readyState === 'complete') resolve(); else window.addEventListener('load', resolve, {once: true}); })`);
        await evaluate(`document.body.innerHTML = ${JSON.stringify(markup)}; window.__diagnostics = []; console.error = (...args) => window.__diagnostics.push(args.map(String).join(" ")); window.__backendCalls = 0; window.createBackendReq = () => { window.__backendCalls++; throw Error('Backend calls forbidden in this fixture'); };`);
        await evaluate(onLoad);
        await evaluate(onLoad); // Reinitialization must remove its previous setup and action listeners.
        await check(`Array.from(document.querySelectorAll('button')).every(b => b.type === 'button')`, 'explicit button types');
        await check(`['native-dialog','custom-dialog','custom-alert','native-popover'].every(id => { const p = document.getElementById(id); return document.getElementById(p.getAttribute('aria-labelledby'))?.textContent; })`, 'accessible labels');
        await click('open-native');
        await check(`document.getElementById('native-dialog').open && document.activeElement.id === 'native-dialog-cancel'`, 'native initial focus');
        await accessible('dialog', 'Confirm action');
        await check(`getComputedStyle(document.getElementById('native-dialog'), '::backdrop').backgroundColor !== 'rgba(0, 0, 0, 0)'`, 'backdrop CSS');
        await evaluate(`window.__cancelCount = 0; document.getElementById('native-dialog').addEventListener('cancel', () => window.__cancelCount++);`);
        await key('Escape');
        await check(`!document.getElementById('native-dialog').open && window.__cancelCount === 1 && document.activeElement.id === 'open-native'`, 'native Escape, cancel event, focus restoration');
        await click('open-native'); await click('native-dialog-cancel');
        await check(`!document.getElementById('native-dialog').open && document.activeElement.id === 'open-native'`, 'native Cancel button');
        for (const [open, panel] of [['open-custom', 'custom-dialog'], ['open-alert', 'custom-alert']]) {
            await click(open);
            await check(`!document.getElementById('${panel}').hidden && document.getElementById('overlay-background').inert && document.activeElement.id === '${panel}-cancel'`, `${panel} visibility, modality and initial focus`);
            await accessible(panel === 'custom-alert' ? 'alertdialog' : 'dialog', panel === 'custom-alert' ? 'Delete item?' : 'Custom confirmation');
            await key('Tab', 8);
            await check(`document.activeElement.id === '${panel}-confirm'`, `${panel} backward focus wrap`);
            await key('Tab');
            await check(`document.activeElement.id === '${panel}-cancel'`, `${panel} forward focus wrap`);
            await key('Escape');
            await check(`document.getElementById('${panel}').hidden && !document.getElementById('overlay-background').inert && document.activeElement.id === '${open}'`, `${panel} Escape and focus restoration`);
            await click(open); await click(`${panel}-cancel`);
            await check(`document.getElementById('${panel}').hidden && document.activeElement.id === '${open}'`, `${panel} Cancel button`);
        }
        await click('open-popover');
        await check(`document.getElementById('native-popover').matches(':popover-open') && document.activeElement.id === 'native-popover-cancel'`, 'popover visibility and focus');
        await accessible('region', 'More options');
        await key('Escape');
        await check(`!document.getElementById('native-popover').matches(':popover-open') && document.activeElement.id === 'open-popover'`, 'popover Escape and focus restoration');
        await click('open-popover'); await click('native-popover-cancel');
        await check(`!document.getElementById('native-popover').matches(':popover-open') && document.activeElement.id === 'open-popover'`, 'popover Cancel');
        await click('open-custom');
        await evaluate(`window[Symbol.for('fdo.renderOnLoad.cleanup')].get('overlay-example')()`);
        await check(`document.getElementById('custom-dialog').hidden && !document.getElementById('overlay-background').inert`, 'cleanup closes custom modal');
        await click('open-native');
        await check(`!document.getElementById('native-dialog').open`, 'cleanup removes action listeners');
        await evaluate(`document.body.innerHTML = ${JSON.stringify(markup)};`);
        await evaluate(onLoad);
        await click('open-native');
        await check(`document.getElementById('native-dialog').open`, 'rerender with new elements rebinds');
        await evaluate(`window.dispatchEvent(new Event('pagehide'))`);
        await check(`!document.getElementById('native-dialog').open && window[Symbol.for('fdo.renderOnLoad.cleanup')].size === 0`, 'page teardown closes native modal and removes lifecycle');
        await check('window.__diagnostics.length === 0', 'no lifecycle or asynchronous browser errors');
        await check('window.__backendCalls === 0', 'composition and frontend overlays never call backend');
        console.log(`Chrome: ${checks} overlay checks passed.`);
        if (componentChecks) {
            const previousChecks = checks;
            await componentChecks({ evaluate, check, accessible, click, key, settle, send, sessionId });
            console.log(`Chrome: ${checks - previousChecks} SDK component checks passed (${checks} total).`);
        }
    } finally {
        if (chrome.exitCode === null && chrome.signalCode === null) {
            try { await send('Browser.close'); } catch { chrome.kill(); }
        }
        await new Promise(resolve => { if (chrome.exitCode !== null || chrome.signalCode !== null) resolve(); else chrome.once('exit', resolve); });
        for (const stream of chrome.stdio) stream?.destroy?.();
        fs.rmSync(profile, { recursive: true, force: true });
    }
}
