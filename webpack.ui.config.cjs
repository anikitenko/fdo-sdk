const path = require('node:path');
const shared = {
    mode: 'production', target: 'web', devtool: 'source-map', entry: './src/ui/index.ts',
    optimization: { minimize: false }, performance: { hints: false },
    resolve: { extensions: ['.ts', '.js'] },
    module: { rules: [{ test: /\.ts$/, exclude: /node_modules/, use: {
        loader: 'ts-loader', options: { compiler: path.resolve(__dirname, 'scripts/typescript-compiler.cjs'), transpileOnly: true },
    } }] },
};
module.exports = [
    { ...shared, name: 'ui-commonjs', output: { path: path.resolve(__dirname, 'dist'), filename: 'ui.cjs', library: { type: 'commonjs2' } } },
    { ...shared, name: 'ui-esm', dependencies: ['ui-commonjs'], experiments: { outputModule: true }, output: { path: path.resolve(__dirname, 'dist'), filename: 'ui.mjs', library: { type: 'module' } } },
];
