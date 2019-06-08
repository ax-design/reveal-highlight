import typescript from 'rollup-plugin-typescript2';
import babelminify from 'rollup-plugin-babel-minify';

const config = {
    input: './docs/demo/index.ts',
    output: {
        file: './build/demo/main.js',
        format: 'umd',
        name: 'AxDesignRevealHighlightDemo'
    },
    plugins: [babelminify(), typescript()]
};

export default config;
