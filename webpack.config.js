const path = require('path');

module.exports = {
    entry: './src/index.ts',  // Entry point of your SDK
    output: {
        filename: 'fdo-sdk.bundle.js',  // The name of the bundled SDK file
        path: path.resolve(__dirname, 'dist'),
        library: {
            type: 'module',
        },
        clean: true,                // Clean the dist folder before each build
    },
    resolve: {
        extensions: ['.ts', '.js'], // Resolve TypeScript and JavaScript files
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',  // Use ts-loader for TypeScript files
                exclude: /node_modules/,
            },
        ],
    },
    externals: [], // You can add any external libraries here to avoid bundling them
    mode: 'production', // Or 'development' depending on your needs
    devtool: 'source-map', // Optional: source maps for debugging
};
