// Release build. Needs the dist/ output of @ax-design/shape, typed-om and surface.
//   es/            ES2017 modules and declarations (tsc), dependencies imported
//   build/index.mjs one self-contained ES module (demos, CDN)
//   build/main.js   the same as UMD: require() or the AxRevealHighlight global
// The bundles take the ES2017 output of tsc as input and are minified without syntax rewrites,
// so they stay within the browsers this package supports.
import { $ } from 'bun';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
await $`rm -rf ${join(root, 'es')} ${join(root, 'build')}`;
await $`bunx tsc -p ${join(root, 'tsconfig.json')}`;

const minify = { whitespace: true, identifiers: true, syntax: false };
const bundle = async (format: 'esm') => {
    const result = await Bun.build({ entrypoints: [join(root, 'es/index.js')], format, target: 'browser', minify });
    if (!result.success) throw new Error(result.logs.join('\n'));
    return result.outputs[0].text();
};

const esm = await bundle('esm');
await Bun.write(join(root, 'build/index.mjs'), esm);

// UMD from the ES module: its final `export { a as b, ... }` becomes the returned object. A
// CommonJS bundle would pull in Bun's interop helpers, which use ES2021 syntax.
const tail = /export\s*\{([^}]*)\};?\s*$/.exec(esm);
if (!tail) throw new Error('unexpected bundle format: no trailing export clause');
const fields = tail[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
        const [local, exported] = part.split(/\s+as\s+/);
        return `${exported || local}: ${local}`;
    });
await Bun.write(
    join(root, 'build/main.js'),
    `(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AxRevealHighlight = factory();
})(typeof self !== 'undefined' ? self : this, function () {
${esm.slice(0, tail.index)}
return { ${fields.join(', ')} };
});
`
);
console.log('built es/, build/index.mjs, build/main.js');
