<h1 align="center">
  <img src="https://raw.githubusercontent.com/ax-design/reveal-highlight/master/docs/logo.png" alt="Reveal Hightlight">
</h1>

<p align="center">
  Web component that implements Reveal Highlight of Axiom Design System.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ax-design/reveal-highlight"><img src="https://img.shields.io/npm/v/@ax-design/reveal-highlight.svg" alt="npm version"></a>
  <a href="https://github.com/ax-design/reveal-highlight/actions/workflows/ci.yml"><img src="https://github.com/ax-design/reveal-highlight/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://deepscan.io/dashboard#view=project&tid=4412&pid=6185&bid=50120"><img src="https://deepscan.io/api/teams/4412/projects/6185/branches/50120/badge/grade.svg" alt="DeepScan grade"></a>
  <a href="https://t.me/axiom_chat"><img src="https://img.shields.io/badge/chat-on%20Telegram-%230088cc.svg" alt="Telegram chat group" /></a>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT Licence" />

</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/ax-design/reveal-highlight/master/docs/screen-record.gif" alt="Screenshot">
</p>

## Installation

```bash
// with npm
npm install @ax-design/reveal-highlight

// with yarn
yarn add @ax-design/reveal-highlight
```

and import it:

```javascript
//CommonJS
require('@ax-design/reveal-highlight').register();

//ESModule
import { register } from '@ax-design/reveal-highlight';
register({
  borderDetectionMode: 'experimentalAutoFit',
});
```

If you don't use a bundler, load `build/main.js` (it exposes `AxRevealHighlight`) or import `build/index.mjs`.

## Usage

To add a reveal effect on your web application, you need to wrap a `ax-reveal` component with `ax-reveal-bound`.

`ax-reveal-bound` will manage the rendering behavior of `ax-reveal` components, while your mouse enters the boundary, the highlight components will get started to rendering, while your mouse leaves the boundary component, all highlight effect will disappear.

Here's an example:

```html
<ax-reveal-bound>
  <ax-reveal>
    <button class="ax-reveal-button">Button 1</button>
  </ax-reveal>
  <ax-reveal>
    <button class="ax-reveal-button">Button 2</button>
  </ax-reveal>
</ax-reveal-bound>
```

`ax-reveal-ng` works the same way, but draws with SVG instead of a canvas.

`ax-reveal-provider` from older versions still works in your markup, but it doesn't do anything now, all the reveal components on the page share one engine.

### Options

`register` accepts these options:

* `borderDetectionMode`: `strictEdge` (default) only lights up the components while your pointer is inside their `ax-reveal-bound`. `experimentalAutoFit` also lights them up while your pointer is close to the boundary.
* `compat`: deprecated, it doesn't do anything now. Custom properties which can't be registered fall back to their default values automatically.

### With Surface

Reveal Highlight runs on [Surface](https://github.com/ax-design/surface). You can also use it as a layer of `ax-surface`, together with the shapes, the tilt and the other layers of Surface:

```javascript
import { register } from '@ax-design/surface';
import { registerRevealLayer } from '@ax-design/reveal-highlight';

registerRevealLayer();
register();
```

```html
<ax-surface layers="reveal">
  <button class="ax-reveal-button">Button 1</button>
</ax-surface>
```

Use `layers="reveal-svg"` for the SVG version.

## Style Controlling

* Checkout this living example for detailed usage:
https://ax-design.github.io/playground/?path=/story/components-fundamental-elements-reveal-highlight--basic

* And here're the source code:
https://github.com/ax-design/ax-design.github.io/blob/master/stories/templates/RevealHighlight.ts

## Changes in 0.6

* The highlight runs on Surface, it only works for visible components and draws much less while you move your pointer.
* The border light on `bevel` corners has the full border width now, it used to be thinner on the diagonal.
* `ax-reveal-ng` uses your colors now, it used to draw everything in black.
* `ax-reveal` doesn't need an `ax-reveal-bound` anymore.
* 0.6.1: Inside a tilted `ax-pressure`, the highlight stays under your pointer. `build/main.js` works together with the `build/` files of `@ax-design/acrylic` and `@ax-design/pressure` on the same page, and `import` in Node gives you every export.
* 0.6.2: Built on Surface 0.2, with the shared edge properties and the `cusp` edge of `ax-surface`.

## Development

This package depends on `@ax-design/shape`, `@ax-design/typed-om` and `@ax-design/surface`, build them first, then:

```bash
bun install
bun run build         # es/, build/index.mjs, build/main.js
bun run check         # type check
bun run test:browser  # browser tests
```
