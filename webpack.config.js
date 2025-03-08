import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from "node:path";
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry: ['./src/index.ts'],
    target: "es2020",
    output: {
        filename: 'fdo-sdk.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            type: 'module',
        },
        clean: true,
    },
    externals: {
        fs: 'fs',
        electron: 'electron',
        crypto: 'crypto'
    },
    optimization: {
        minimize: false,
        usedExports: false,
        concatenateModules: false,
    },
    resolve: {
        extensions: ['.ts', '.js'],
        plugins: [new TsconfigPathsPlugin()]
    },
    experiments: {
        outputModule: true
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: { logLevel: "info" }
                    }
                ],
                exclude: ['/node_modules/'],
            },
        ],
    },
    plugins: [
        new NodePolyfillPlugin()
    ],
    mode: 'production',
    devtool: 'source-map',
};
