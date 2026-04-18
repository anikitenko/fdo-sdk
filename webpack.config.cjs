const path = require('path');
const webpack = require('webpack');
const packageJson = require('./package.json');
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
            type: 'commonjs2',
        },
        publicPath: '',
    },
    optimization: {
        minimize: false,
        usedExports: false,
        concatenateModules: false,
    },
    performance: {
        // SDK is shipped as a Node/Electron library bundle, not a web entrypoint.
        // Webpack size hints are not meaningful for this artifact.
        hints: false,
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
        new webpack.DefinePlugin({
            __FDO_SDK_PACKAGE_VERSION__: JSON.stringify(packageJson.version),
        }),
        new DOMMetadataPlugin({
            srcDir: "src",
            outFile: "dom-metadata.json",
        })
    ],
    externals: [
        ({ request }, callback) => {
            if (request && request.startsWith("node:")) {
                return callback(null, `commonjs ${request}`);
            }
            return callback();
        },
        {
            electron: "commonjs electron",
            fs: "commonjs fs",
            path: "commonjs path",
            os: "commonjs os",
            https: "commonjs https",
            http: "commonjs http",
            zlib: "commonjs zlib",
            util: "commonjs util",
            stream: "commonjs stream",
            buffer: "commonjs buffer",
            crypto: "commonjs crypto",
            "worker_threads": "commonjs worker_threads",
            "child_process": "commonjs child_process"
        }
    ]
};
