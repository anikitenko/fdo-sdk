const fs = require('node:fs');
// Importing the SDK is side-effect-free with respect to plugin execution.
// Derive the facade from actual public runtime exports, never a second API list.
const names = Object.keys(require('../dist/fdo-sdk.bundle.js')).filter(name => name !== '__esModule');
for (const name of names) {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error(`Invalid SDK export identifier: ${name}`);
}
fs.writeFileSync('dist/fdo-sdk.mjs', `import sdk from './fdo-sdk.bundle.js';\nexport const { ${names.join(', ')} } = sdk;\nexport default sdk;\n`);
