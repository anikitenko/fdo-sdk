import fs from 'node:fs';
import path from 'node:path';
import { Node, Project, SyntaxKind } from 'ts-morph';

/** Read literal example metadata without importing/initializing plugin backend code. */
export function readExampleMetadata(examplesRoot) {
    const project = new Project({ useInMemoryFileSystem: true });
    const entries = [];
    const walk = directory => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) { walk(file); continue; }
            if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
            const source = project.createSourceFile('/' + path.relative(examplesRoot, file).replaceAll('\\', '/'), fs.readFileSync(file, 'utf8'));
            for (const cls of source.getClasses()) {
                for (const field of cls.getProperties()) {
                    if (field.getTypeNode()?.getText() !== 'PluginMetadata') continue;
                    const object = field.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
                    if (!object) throw Error(`Example metadata must be statically reviewable: ${file}:${field.getStartLineNumber()}`);
                    const metadata = {};
                    for (const property of object.getProperties()) {
                        if (!Node.isPropertyAssignment(property)) continue;
                        const literal = property.getInitializerIfKind(SyntaxKind.StringLiteral);
                        if (!literal) throw Error(`Expected literal metadata property in ${file}: ${property.getText()}`);
                        metadata[property.getName()] = literal.getLiteralValue();
                    }
                    entries.push({ file: path.relative(examplesRoot, file).replaceAll('\\', '/'), className: cls.getName(), metadata });
                }
            }
        }
    };
    walk(examplesRoot);
    if (!entries.length) throw Error('No packaged PluginMetadata declarations were found.');
    return entries;
}
