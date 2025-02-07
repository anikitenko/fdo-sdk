const path = require("path");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
    entry: './src/index.ts',  // Entry point of your SDK
    output: {
        filename: 'fdo-sdk.bundle.js',  // The name of the bundled SDK file
        path: path.resolve(__dirname, 'dist'),
        library: {
            name: 'FDO_SDK',
            type: 'umd',
        },
        clean: true, // Clean the dist folder before each build
    },
    resolve: {
        extensions: ['.ts', '.js'],
        plugins: [new TsconfigPathsPlugin()]
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
