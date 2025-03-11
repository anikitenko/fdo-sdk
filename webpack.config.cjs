const path = require('path');

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
        globalObject: 'typeof self !== "undefined" ? self : this'
    },
    resolve: {
        extensions: ['.ts', '.js', '.json']
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
    externals: {
        fs: 'fs',
        electron: 'commonjs electron',
        crypto: 'crypto',
        os: "os",
        https: "https",
        http: "http",
        zlib: "zlib",
        path: "path",
        stream: "stream",
        util: "util",
        buffer: "buffer"
    }
};
