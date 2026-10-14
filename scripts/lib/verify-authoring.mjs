import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Project } from 'ts-morph';
const { Ajv2020 } = createRequire(import.meta.url)('ajv/dist/2020');

export function verifyAuthoring(packageRoot, requireFrom) {
    const fixtureRequire = createRequire(requireFrom);
    const loadFixture = specifier => fixtureRequire(specifier);
    const legacy = loadFixture('@anikitenko/fdo-sdk/dom-metadata.json');
    const contract = loadFixture('@anikitenko/fdo-sdk/dom-authoring-contract.json');
    const schema = loadFixture('@anikitenko/fdo-sdk/dom-authoring-contract.schema.json');
    const validate = new Ajv2020({ strict: true }).compile(schema);
    assert(validate(contract), JSON.stringify(validate.errors));
    assert(Array.isArray(legacy), 'Legacy metadata must remain an array');
    const project = new Project({ compilerOptions: { skipLibCheck: true } });
    const declarations = project.addSourceFilesAtPaths(path.join(packageRoot, 'dist/@types/DOM*.d.ts'));
    const normalize = text => text.replace(/import\("[^"]+"\)\./g, '').replace(/\s+/g, '');
    let methods = 0;
    let examples = 0;
    const snippets = [];
    for (const entry of contract.classes) {
        const cls = declarations.flatMap(file => file.getClasses()).find(cls => cls.getName() === entry.name);
        assert(cls, `Missing declaration ${entry.name}`);
        const publicMethods = cls.getMethods().filter(method => method.getScope() === 'public');
        assert.deepEqual(entry.methods.map(m => m.name).sort(), publicMethods.map(m => m.getName()).sort());
        const checkParameters = (parameters, expected) => {
            assert.equal(parameters.length, expected.length);
            parameters.forEach((param, index) => {
                assert.equal(param.name, expected[index].getName());
                assert.equal(param.optional, expected[index].isOptional());
                assert.equal(param.rest, expected[index].isRestParameter());
                const parameterType = text => param.optional ? normalize(text).replace(/\|undefined$/, '') : normalize(text);
                assert.equal(parameterType(param.type), parameterType(expected[index].getType().getText(expected[index])), `Parameter ${param.name}`);
            });
        };
        entry.constructors.forEach((ctor, index) => checkParameters(ctor.parameters, cls.getConstructors()[index].getParameters()));
        for (const method of entry.methods) {
            const declaration = cls.getMethodOrThrow(method.name);
            assert.equal(normalize(method.returnType), normalize(declaration.getReturnType().getText(declaration)));
            checkParameters(method.parameters, declaration.getParameters());
            const oldMethod = legacy.find(c => c.className === entry.name).methods.find(m => m.name === method.name);
            assert.equal(oldMethod.returnType, method.returnType);
            assert.equal(oldMethod.example ?? null, method.example);
            if (method.example) {
                snippets.push(`// ${entry.name}.${method.name}\n{\n${method.example}\n}`);
                examples++;
            }
            methods++;
        }
    }
    const imports = contract.classes.map(c => c.name).join(', ');
    // language=TEXT
    const source = `import metadata from '@anikitenko/fdo-sdk/dom-metadata.json';
import authoring from '@anikitenko/fdo-sdk/dom-authoring-contract.json';
import schema from '@anikitenko/fdo-sdk/dom-authoring-contract.schema.json';
void [metadata, authoring.contractVersion, schema.title];
import { ${imports}, DOMStyleMap } from '@anikitenko/fdo-sdk';\n${snippets.join('\n')}\nconst oldStyle: Record<string, string> = { color: 'red' };\nconst recursive: DOMStyleMap = { ...oldStyle, '&:hover': { color: 'blue' }, '@media (min-width: 1px)': { '--gap': '2px' } };\nnew DOM().createClassFromStyle(recursive);\n`;
    return { contract, source, methods, examples };
}
