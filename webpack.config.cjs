const path = require('path');
const DOMMetadataPlugin = require("./extract-dom-classes");

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: './src/index.ts',
    output: {
        filename: 'fdo-sdk.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
        library: {
            name: 'fdoSDK',
            type: 'umd',
        },
        publicPath: '',
        globalObject: 'typeof self !== "undefined" ? self : this'
    },
    optimization: {
        minimize: false,
        usedExports: false,
        concatenateModules: false,
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'ts-loader'
            }
        ]
    },
    plugins: [
        new DOMMetadataPlugin({
            srcDir: "src",
            outFile: "dom-metadata.json",
        })
    ],
    externals: {
        electron: 'commonjs electron',
        fs: 'fs',
        path: 'path',
        os: 'os',
        https: 'https',
        http: 'http',
        zlib: 'zlib',
        util: 'util',
        stream: 'stream',
        buffer: 'buffer',
        crypto: 'crypto',
        "worker_threads": "worker_threads",
        "child_process": "child_process"
    }
};
