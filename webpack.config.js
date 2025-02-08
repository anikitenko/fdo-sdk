import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry: './src/index.ts',  // Entry point of your SDK
    target: "electron-renderer",
    output: {
        filename: 'fdo-sdk.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            type: 'module',
        },
        clean: true, // Clean the dist folder before each build
        globalObject: 'this',
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
    mode: 'production',
    devtool: 'source-map',
};
