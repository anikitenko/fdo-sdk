const fs = require('node:fs');
const path = require('node:path');
const { Project } = require('ts-morph');
const { UI_COMPONENT_CONTRACT_VERSION, UI_COMPONENT_DEFINITIONS, UI_COMPONENT_PREVIEWS, createComponentGallery, DOM } = require('../dist/ui.cjs');
const project = new Project({ tsConfigFilePath: path.resolve('tsconfig.json') });
const api = project.getSourceFiles('src/ui/*.ts');
const functions = api.flatMap(file => file.getFunctions()).filter(fn => fn.isExported());
const types = api.flatMap(file => [...file.getInterfaces(), ...file.getTypeAliases()]).filter(type => type.isExported());
const normalize = value => value.replace(/import\("[^"]+"\)\./g, '');
const signature = fn => `${fn.getName()}(${fn.getParameters().map(param => `${param.getName()}${param.isOptional() ? '?' : ''}: ${normalize(param.getType().getText(param))}`).join(', ')}): ${normalize(fn.getReturnType().getText(fn))}`;
const components = UI_COMPONENT_DEFINITIONS.map(component => {
    const create = functions.find(fn => fn.getName() === component.create);
    const mount = functions.find(fn => fn.getName() === component.mount);
    if (!create || !mount) throw Error(`Missing authoritative component function ${component.identity}`);
    const props = project.getSourceFileOrThrow('src/ui/types.ts').getInterfaceOrThrow(component.markupType).getType();
    const editableProperties = component.properties.map(name => {
        let type = props;
        let property;
        let optionalPath = false;
        for (const part of name.split('.')) {
            property = type.getProperty(part);
            if (!property) throw Error(`Missing editable property ${component.identity}.${name}`);
            optionalPath ||= property.isOptional();
            type = property.getTypeAtLocation(property.getDeclarations()[0]).getNonNullableType();
        }
        const leaf = name.split('.').pop();
        return { name, type: normalize(type.getText(property.getDeclarations()[0])), kind: ['visible', 'disabled', 'open', 'multiple'].includes(leaf) ? 'boolean' : leaf === 'items' ? 'collection' : ['variant', 'orientation'].includes(leaf) ? 'enum' : leaf === 'value' ? 'number-or-null' : leaf === 'max' ? 'number' : name === 'variant' ? 'enum' : name === 'progress' ? 'component-options' : name === 'id' ? 'identity' : name.endsWith('.style') ? 'style-map' : name.endsWith('.classes') ? 'class-names' : 'text', optional: optionalPath };
    });
    return {
        ...component, editableProperties,
        ...(component.itemType ? { itemProperties: project.getSourceFileOrThrow('src/ui/types.ts').getInterfaceOrThrow(component.itemType).getProperties().map(property => {
            const type = property.getType().getNonNullableType();
            const description = property.getJsDocs().map(doc => doc.getDescription()).join(' ');
            return { name: property.getName(), type: normalize(type.getText(property)), optional: property.hasQuestionToken(),
                kind: /trusted html/i.test(description) ? 'trusted-html' : property.getName() === 'key' ? 'identity' : type.isBoolean() ? 'boolean' : 'text' };
        }) } : {}),
        closeReasons: component.closeReasonType === null ? [] : project.getSourceFileOrThrow('src/ui/types.ts').getTypeAliasOrThrow(component.closeReasonType ?? 'UICloseReason').getType().getUnionTypes().map(type => type.getLiteralValue()),
        returnKinds: { create: 'html-string', mount: 'frontend-controller' },
        eventContracts: component.events.map(name => {
            const iface = project.getSourceFileOrThrow('src/ui/types.ts').getInterfaceOrThrow(component.mountType).getType();
            const event = iface.getProperty(name);
            if (!event) throw Error(`Missing event ${component.identity}.${name}`);
            return { name, type: normalize(event.getTypeAtLocation(event.getDeclarations()[0]).getNonNullableType().getText(event.getDeclarations()[0])), optional: event.isOptional(), phase: 'frontend', staticPreviewSafe: false };
        }),
        identityAttribute: 'data-fdo-component', versionAttribute: 'data-fdo-component-version',
        stateAttribute: 'data-fdo-state', slotAttribute: 'data-fdo-slot',
        signatures: { create: signature(create), mount: signature(mount) },
        preview: { markupOnly: true, handlers: false, backendExecution: false, requirements: ['Render validated serializable properties with an isolated DOM style collector.', 'Sanitize trusted HTML slots.', 'Do not mount or invoke callbacks for static preview.', 'Open/pending/error/indeterminate preview states are host-owned visual simulations; preserve authored source.'] },
    };
});
const contract = { contractVersion: UI_COMPONENT_CONTRACT_VERSION, sdkVersion: require('../package.json').version, components };
fs.writeFileSync('dist/ui-components.json', JSON.stringify(contract, null, 2) + '\n');
fs.copyFileSync('scripts/ui-components.schema.json', 'dist/ui-components.schema.json');
const documentation = [
    '# Generated UI component API', '',
    'Generated from SDK TypeScript declarations/JSDoc and component definitions. Run `npm run build` to refresh. Do not edit this file.', '',
    `Authoring contract: ${UI_COMPONENT_CONTRACT_VERSION}. Markup returns HTML strings; mounting is frontend-only and never requests backend capabilities.`, '',
    ...components.flatMap(component => [
        `## ${component.name}`, '', `Identity: \`${component.identity}\`; primitive: \`${component.primitive}\`; role: \`${component.role}\`.`, '',
        '```typescript', `declare function ${component.signatures.create};`, `declare function ${component.signatures.mount};`, '```', '',
        '| Editable property | Type | Optional |', '| --- | --- | --- |',
        ...component.editableProperties.map(p => `| \`${p.name}\` | \`${p.type.replace(/\|/g, '&#124;')}\` | ${p.optional} |`), '',
        `Child slots: ${component.slots.map(slot => `\`${slot.name}\``).join(', ') || 'none'}. States: ${component.states.map(state => `\`${state}\``).join(', ')}.`, '',
        `Events: ${component.events.map(event => `\`${event}\``).join(', ')}.`, '',
    ]),
    '## Exported types', '',
    ...types.flatMap(type => ['```typescript', type.getText().replace(/^export /, ''), '```', '']),
];
// Keep generated tables aligned for both Markdown renderers and IDE inspections.
function formatTable(block) {
    const rows = block.trimEnd().split('\n').map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
    const widths = rows[0].map((_, column) => Math.max(3, ...rows.map(row => row[column].length)));
    return rows.map((row, index) => '| ' + row.map((cell, column) => index === 1 ? '-'.repeat(widths[column]) : cell.padEnd(widths[column])).join(' | ') + ' |').join('\n') + '\n';
}
fs.writeFileSync('docs/UI_COMPONENT_API.generated.md', (documentation.join('\n') + '\n').replace(/(?:^\|[^\n]+\|\n)+/gm, formatTable));

// SDK-owned serializable cases are the gallery and browser-regression source of truth.
for (const component of UI_COMPONENT_DEFINITIONS) {
    for (const state of component.states) {
        if (!UI_COMPONENT_PREVIEWS.some(preview => preview.identity === component.identity && preview.state === state)) throw Error(`Missing preview ${component.identity}:${state}`);
    }
}
const previews = { contractVersion: '1.0.0', componentContractVersion: UI_COMPONENT_CONTRACT_VERSION, cases: UI_COMPONENT_PREVIEWS };
fs.writeFileSync('dist/ui-previews.json', JSON.stringify(previews, null, 2) + '\n');
fs.copyFileSync('scripts/ui-previews.schema.json', 'dist/ui-previews.schema.json');
const galleryDOM = new DOM().collectStylesFrom();
const gallery = galleryDOM.renderHTML(createComponentGallery(galleryDOM)).replace(/<script id="plugin-script-placeholder"[^>]*><\/script>/, '');
fs.writeFileSync('dist/ui-gallery.html', '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FDO SDK component gallery</title></head><body><main><h1>FDO SDK component gallery</h1><p>Static, inert visual states. No handlers or backend code execute.</p>' + gallery + '</main></body></html>\n');
