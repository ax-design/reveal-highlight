<h1 align="center">
  <img src="https://raw.githubusercontent.com/ax-design/reveal-highlight/master/docs/logo.png" alt="Reveal Hightlight">
</h1>

<p align="center">
  React component that implements Reveal Highlight of Axiom Design System.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ax-design/reveal-highlight"><img src="https://img.shields.io/npm/v/@ax-design/reveal-highlight.svg" alt="npm version"></a>
  <a href="https://travis-ci.com/ax-design/reveal-highlight"><img src="https://travis-ci.com/ax-design/reveal-highlight.svg?branch=master" alt="CI status"></a>
  <a href="https://deepscan.io/dashboard#view=project&tid=4412&pid=6185&bid=50120"><img src="https://deepscan.io/api/teams/4412/projects/6185/branches/50120/badge/grade.svg" alt="DeepScan grade"></a>
  <a href="https://t.me/axiom_chat"><img src="https://img.shields.io/badge/chat-on%20Telegram-%230088cc.svg" alt="Telegram chat group" /></a>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT Licence" />

</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/ax-design/reveal-highlight/master/docs/screen-record.gif" alt="Screenshot">
</p>

## Installation

```bash
npm install @ax-design/reveal-highlight
# or
bun add @ax-design/reveal-highlight
```

and register the elements once:

```javascript
// CommonJS
require('@ax-design/reveal-highlight').register();

// ES modules
import { register } from '@ax-design/reveal-highlight';
register({
  borderDetectionMode: 'experimentalAutoFit',
});
```

Without a bundler, load `build/main.js` (exposes `AxRevealHighlight`) or import `build/index.mjs`.

### Options

* `borderDetectionMode`: `'strictEdge'` (default) lights reveals only while the pointer is over
  their `ax-reveal-bound`. `'experimentalAutoFit'` also lights them when the pointer is near the
  boundary, within the light radius.
* `compat`: deprecated, no effect. Properties that the browser cannot register fall back to their
  initial values on their own.

## Usage

Wrap the content that should light up in `ax-reveal` (canvas) or `ax-reveal-ng` (SVG), and group
them with `ax-reveal-bound`:

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

`ax-reveal-bound` decides when its reveals react to the pointer (see `borderDetectionMode`). A
reveal outside any boundary follows the pointer everywhere.

`ax-reveal-provider` is still accepted so existing markup keeps working, but it no longer does
anything: all reveals on a page share one engine.

## Engine

`ax-reveal` and `ax-reveal-ng` run on `@ax-design/surface`: one frame scheduler for
every surface on the page, style reads only after a style change, work only for visible
elements, and lower frame rates for far and small elements when the page is measured to drop
frames. The shape comes from `@ax-design/shape`.

The same effect is available as a layer of `ax-surface`, combined with the surface shapes, tilt
and other layers:

```javascript
import { register } from '@ax-design/surface';
import { registerRevealLayer } from '@ax-design/reveal-highlight';

registerRevealLayer();
register();
```

```html
<ax-surface layers="reveal">…</ax-surface>      <!-- canvas -->
<ax-surface layers="reveal-svg">…</ax-surface>  <!-- SVG -->
```

### Changes from 0.5

* The border light on bevel corners now has the full border width (it used to be about 0.7 of it
  on the diagonal).
* `ax-reveal-ng` now uses the reveal colors (it used to draw every gradient in black).
* `ax-reveal` no longer requires an `ax-reveal-bound` ancestor.

## Style Controlling

All `--reveal-*` custom properties keep their names, values and defaults.

* Checkout this living example for detailed usage:
https://ax-design.github.io/playground/?path=/story/components-fundamental-elements-reveal-highlight--basic

* And here're the source code:
https://github.com/ax-design/ax-design.github.io/blob/master/stories/templates/RevealHighlight.ts

## Development

The package depends on `@ax-design/shape`, `@ax-design/typed-om` and `@ax-design/surface`. Build
those first (their `dist/` holds the ES2017 output and the type declarations), then:

```bash
bun install
bun run build         # es/, build/index.mjs, build/main.js (all ES2017)
bun run check         # type check
bun run test:browser  # browser tests (Playwright), both border detection modes
```
