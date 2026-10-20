<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ax-design/reveal-highlight/master/docs/logo-r.png">
    <img src="https://raw.githubusercontent.com/ax-design/reveal-highlight/master/docs/logo.png" alt="Ax Pressure">
  </picture>
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

As Reveal on Windows, the highlight is not drawn in forced colors mode, with reduced transparency, or after `setAlwaysUseFallback(true)` from `@ax-design/surface`. Reduced motion leaves it on, as on Windows.

### Keyboard presses and waiting for the press

`press()` from `@ax-design/surface` plays the press ripple, as a pointer press does. Called without a point (or with `'center'`), it is a keyboard press: the ripple is centered, and no hover or border light is drawn, as WinUI does. `press({ x, y })` presses that point like a pointer.

`pressRemaining()` returns the milliseconds until the press ripple has finished, or 0 when nothing is drawn. A tile can use it to delay its click until the press feedback is over, as the planned `@ax-design/tile` does:

```javascript
surface.press();
requestAnimationFrame(() => setTimeout(activate, surface.pressRemaining()));
```

### Motion

Reveal follows `motion()` of `ax-surface`: the fade of a motion is set on the layer's own canvas or SVG, never on an ancestor, and the light and the ripple turn with the shape. In Firefox, where a 3D motion is drawn in flat containers, the layers draw the projected outline themselves and center the light on it, so the highlight stays on the shape while it moves; elsewhere the container carries the transform and nothing changes.

## High contrast

In Windows High Contrast the light is gone, so the button needs a solid border of its own. On Windows, the Reveal resources of WinUI draw that border as `ButtonText` at rest and `Highlight` on hover and press. Copy the same rules to get the same look on the web:

```css
@media (forced-colors: active) {
  .ax-reveal-button { border: 1px solid ButtonText; }
  .ax-reveal-button:hover, .ax-reveal-button:active { border-color: Highlight; }
}
```

For a shape that is not a rectangle, the border of a CSS box can't follow it. Use the `fill` layer of Surface instead (`<ax-surface layers="fill reveal">`): its border is drawn in `CanvasText` by itself in forced colors, so it follows the shape with no CSS.

### Higher contrast

`prefers-contrast: more` (for example macOS "Increase contrast") changes nothing by itself: Windows has no such setting, so Reveal keeps its look. To make the light stronger for those users, raise its opacity and, if you want, its border color inside the media query:

```css
@media (prefers-contrast: more) {
  ax-reveal, ax-surface {
    --reveal-opacity: 0.5;
    --reveal-border-color: rgb(0, 0, 0);
  }
}
```

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

## Changes in 0.7

* Built on Surface 0.3. The highlight follows `motion()` of the surface.
* A press from the keyboard plays its ripple from the middle, also inside an `ax-reveal-bound` while the pointer is away, and the ripple reports when it has finished.
* No highlight is drawn when the effects fall back (forced colors, reduced transparency), like Reveal on Windows. The README shows the border a button needs in forced colors, as WinUI draws it.
* Slotted buttons keep their focus ring for keyboard focus.
* 0.7.1: Built on Surface 0.3.3, which maps a pointer through a scaled or zoomed ancestor, so a highlight follows the pointer under a zoomed page.

## Development

This package depends on `@ax-design/shape`, `@ax-design/typed-om` and `@ax-design/surface`, build them first, then:

```bash
bun install
bun run build         # es/, build/index.mjs, build/main.js
bun run check         # type check
bun run test:browser  # browser tests
```
