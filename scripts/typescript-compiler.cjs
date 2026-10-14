// ts-loader requires the classic compiler API. TypeScript 7's root export is
// version-only; use the same compiler API as the metadata generator.
module.exports = require('ts-morph').ts;
