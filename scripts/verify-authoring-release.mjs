import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { verifyAuthoring } from './lib/verify-authoring.mjs';
import { componentBrowserChecks } from './lib/verify-browser-components.mjs';
import { verifyBrowserOverlays } from './lib/verify-browser-overlays.mjs';

const { Ajv2020 } = createRequire(import.meta.url)('ajv/dist/2020');
const root = process.cwd();
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'fdo-authoring-release-'));
const cache = path.join(root, '.npm-cache-pack');
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, npm_config_cache: cache } });
try {
    run('npm', ['run', 'build']);
    const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', fixture], { cwd: root, encoding: 'utf8', env: { ...process.env, npm_config_cache: cache } }))[0];
    fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'commonjs' }));
    run('npm', ['install', path.join(fixture, packed.filename), `@types/node@${JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@types/node/package.json'), 'utf8')).version}`, '--ignore-scripts', '--no-audit', '--no-fund', ...(process.env.FDO_RELEASE_OFFLINE === '1' ? ['--offline'] : [])], fixture);
    const fixtureRequire = createRequire(path.join(fixture, 'package.json'));
    const loadFixture = specifier => fixtureRequire(specifier);
    fs.writeFileSync(path.join(fixture, 'public-imports.mjs'), `import sdk, { DOM, DOMText, defineRenderOnLoadActions } from '@anikitenko/fdo-sdk';
import * as namespace from '@anikitenko/fdo-sdk';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const commonjs = require('@anikitenko/fdo-sdk');
assert.strictEqual(sdk, commonjs, 'Native ESM default must preserve the CommonJS module object');
assert.strictEqual(namespace.default, sdk);
assert.strictEqual(sdk.DOM, DOM);
assert.strictEqual(sdk.DOMText, DOMText);
assert.strictEqual(sdk.defineRenderOnLoadActions, defineRenderOnLoadActions);
if (typeof DOM !== 'function' || typeof DOMText !== 'function' || typeof defineRenderOnLoadActions !== 'function') throw Error('Missing native ESM public imports');
`);
    run(process.execPath, [path.join(fixture, 'public-imports.mjs')], fixture);
    // Compiled against the installed tarball, not the repository's module resolver.
    // language=TEXT
    const publicTypeSource = `import defaultSDK, * as sdk from '@anikitenko/fdo-sdk';
import * as ui from '@anikitenko/fdo-sdk/ui';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
assert.strictEqual(defaultSDK, require('@anikitenko/fdo-sdk'));
const defaultDOM: typeof sdk.DOM = defaultSDK.DOM;
assert.strictEqual(defaultDOM, sdk.DOM);
assert.deepEqual(Object.keys(sdk).filter(name => name !== 'default').sort(), Object.keys(require('@anikitenko/fdo-sdk')).sort());
assert.deepEqual(Object.keys(ui).sort(), Object.keys(require('@anikitenko/fdo-sdk/ui')).sort());
const html: string = ui.createConfirmationDialog(new ui.DOM(), {id: 'typed', title: 'Confirm', options: {style:{'&:hover':{color:'red'}}}});
void html;
function frontendTypeChecks() {
const dialogController: ui.DialogController = ui.mountDialog(document.createElement('dialog'));
dialogController.getState();
dialogController.destroy();
const confirmation: ui.ConfirmationDialogController = ui.mountConfirmationDialog(document.createElement('dialog'), {onConfirm: async ({signal}) => { void signal.aborted; }});
void confirmation.confirm();
const popover: ui.PopoverController = ui.mountPopover(document.createElement('div'), {anchor: document.createElement('button'), placement:'top-end'});
popover.updatePosition();
const alert: ui.InlineAlertController = ui.mountInlineAlert(document.createElement('div'));
alert.update({message:'Updated', variant:'warning'});
const action: ui.AsyncActionButtonController = ui.mountAsyncActionButton(document.createElement('div'), {onAction: async ({signal}) => { void signal.aborted; }});
const pending: Promise<boolean> = action.run();
void pending; action.cancel(); action.reset(); action.setDisabled(false);
const region: ui.ToastRegionController = ui.mountToastRegion(document.createElement('section'), {maxVisible:1, maxQueued:2});
const accepted: boolean = region.enqueue(document.createElement('div'), {key:'task', duration:5000});
void accepted; region.dismiss('task');
const tabs: ui.TabsController = ui.mountTabs(document.createElement('div'), {activation:'manual'});
tabs.select('general');
const disclosure: ui.DisclosureController = ui.mountDisclosure(document.createElement('details'));
disclosure.toggle();
const accordion: ui.AccordionController = ui.mountAccordion(document.createElement('section'));
accordion.setOpen('first', true);
void [alert.getState(), action.getState(), region.getState(), tabs.getState(), disclosure.getState(), accordion.getState()];
for (const controller of [alert, action, region, tabs, disclosure, accordion]) controller.destroy();
}
void frontendTypeChecks;
const style: sdk.DOMStyleMap = { '&:hover': { color: 'red' } };
new sdk.DOM().collectStylesFrom().createClassFromStyle(style);
`;
    fs.writeFileSync(path.join(fixture, 'public-imports.mts'), publicTypeSource);
    const sdk = loadFixture('@anikitenko/fdo-sdk'); // No Electron shim or backend initialization.
    const ui = loadFixture('@anikitenko/fdo-sdk/ui');
    const uiContract = loadFixture('@anikitenko/fdo-sdk/ui-components.json');
    const uiSchema = loadFixture('@anikitenko/fdo-sdk/ui-components.schema.json');
    const validateUI = new Ajv2020({ strict: true }).compile(uiSchema);
    assert(validateUI(uiContract), JSON.stringify(validateUI.errors));
    assert.deepEqual(uiContract.components.map(c => c.identity), ui.UI_COMPONENT_DEFINITIONS.map(c => c.identity));
    for (const c of uiContract.components) { assert.equal(typeof ui[c.create], 'function'); assert.equal(typeof ui[c.mount], 'function'); }
    const previewContract = loadFixture('@anikitenko/fdo-sdk/ui-previews.json');
    const previewSchema = loadFixture('@anikitenko/fdo-sdk/ui-previews.schema.json');
    const validatePreviews = new Ajv2020({ strict: true }).compile(previewSchema);
    assert(validatePreviews(previewContract), JSON.stringify(validatePreviews.errors));
    assert.equal(previewContract.componentContractVersion, uiContract.contractVersion);
    assert.deepEqual(previewContract.cases, ui.UI_COMPONENT_PREVIEWS);
    for (const component of uiContract.components) for (const state of component.states) assert(previewContract.cases.some(preview => preview.identity === component.identity && preview.state === state));
    const galleryPath = fixtureRequire.resolve('@anikitenko/fdo-sdk/ui-gallery.html');
    const galleryHTML = fs.readFileSync(galleryPath, 'utf8');
    assert(!/<script\b|\son[a-z]+=|createBackendReq/i.test(galleryHTML), 'Gallery must contain no scripts, handlers or backend transport');
    const packageRoot = path.dirname(fixtureRequire.resolve('@anikitenko/fdo-sdk/package.json'));
    const verified = verifyAuthoring(packageRoot, path.join(fixture, 'package.json'));
    for (const entry of verified.contract.classes) {
        const instance = new sdk[entry.name]();
        for (const method of entry.methods) assert.equal(typeof instance[method.name], 'function', `${entry.name}.${method.name}`);
    }
    fs.writeFileSync(path.join(fixture, 'metadata-examples.ts'), `import components from '@anikitenko/fdo-sdk/ui-components.json';\nimport uiSchema from '@anikitenko/fdo-sdk/ui-components.schema.json';\nvoid [components.contractVersion, uiSchema.properties];\nimport previews from '@anikitenko/fdo-sdk/ui-previews.json';\nimport previewSchema from '@anikitenko/fdo-sdk/ui-previews.schema.json';\nvoid [previews.cases, previewSchema.title];\n` + verified.source);
    fs.cpSync(path.join(packageRoot, 'examples'), path.join(fixture, 'examples'), { recursive: true });
    // Resolve exclusively through the installed package; discard repository paths.
    fs.writeFileSync(path.join(fixture, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2020', types: ['node'], experimentalDecorators: true, module: 'Node16', moduleResolution: 'Node16', strict: true, skipLibCheck: true, resolveJsonModule: true, esModuleInterop: true, outDir: 'compiled' },
        include: ['metadata-examples.ts', 'public-imports.mts', 'examples/**/*.ts'], exclude: ['examples/tsconfig.json'],
    }));
    run(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(fixture, 'tsconfig.json')], fixture);
    // Execute only SDK-owned DOM metadata examples and the pure overlay fixture.
    fixtureRequire(path.join(fixture, 'compiled/metadata-examples.js'));
    run(process.execPath, [path.join(fixture, 'compiled/public-imports.mjs')], fixture);
    // Never import/initialize the packaged plugin backend examples.
    const overlay = fixtureRequire(path.join(fixture, 'compiled/examples/13-overlay-patterns.js'));
    const dom = new ui.DOM().collectStylesFrom();
    const components = dom.renderHTML('<button id="open-a" type="button">Open A</button><button id="open-b" type="button">Open B</button><button id="outside" type="button">Outside</button><button id="anchor" type="button" aria-controls="caller" aria-expanded="false" style="position:fixed;right:0;bottom:0">Anchor</button>' +
        ui.createDialog(dom, {id:'a', title:'Internal title', body:'<h3 id="external-label">Caller name</h3><p id="external-description">Caller description</p>', ariaLabelledBy:'external-label', ariaDescribedBy:'external-description', options:{style:{'--fdo-ui-background':'pink'}}}) +
        ui.createDialog(dom, {id:'b', title:'Other dialog'}) +
        ui.createConfirmationDialog(dom, {id:'c', title:'Confirm changes?', description:'Review the change.'}) +
        ui.createPopover(dom, {id:'p', title:'Options', body:'<p style="width:200px;height:100px">Large popover content</p>'}));
    await verifyBrowserOverlays(overlay.overlayMarkup(), sdk.resolveRenderOnLoadSource(overlay.overlayOnLoad()), componentBrowserChecks(fs.readFileSync(path.join(packageRoot, 'dist/ui.mjs'), 'utf8'), components));
    console.log(`Release gate passed: installed tarball; ${verified.contract.classes.length} constructors, ${verified.methods} public DOM methods; ${verified.examples} generated examples and all packaged examples compiled; Chrome overlay checks passed.`);
} finally {
    fs.rmSync(fixture, { recursive: true, force: true });
}
