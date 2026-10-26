# Changelog

All notable changes to this package are documented in this file.

## 0.7.2

- Depends on @ax-design/surface 0.4 and typed-om 0.3 (no duplicate copies next to packages that use them).

## 0.7.1

- Built on Surface 0.3.3, which maps a pointer through a scaled or zoomed ancestor, so a highlight follows the pointer under a zoomed page.

## 0.7.0

- Built on Surface 0.3. The highlight follows `motion()` of the surface.
- A press from the keyboard plays its ripple from the middle, also inside an `ax-reveal-bound` while the pointer is away, and the ripple reports when it has finished.
- No highlight is drawn when the effects fall back (forced colors, reduced transparency), like Reveal on Windows. The README shows the border a button needs in forced colors, as WinUI draws it.
- Slotted buttons keep their focus ring for keyboard focus.

## 0.6.2

- Built on Surface 0.2, with the shared edge properties and the `cusp` edge of `ax-surface`.

## 0.6.1

- Inside a tilted `ax-pressure`, the highlight stays under your pointer. `build/main.js` works together with the `build/` files of `@ax-design/acrylic` and `@ax-design/pressure` on the same page, and `import` in Node gives you every export.

## 0.6.0

- The highlight runs on Surface, it only works for visible components and draws much less while you move your pointer.
- The border light on `bevel` corners has the full border width now, it used to be thinner on the diagonal.
- `ax-reveal-ng` uses your colors now, it used to draw everything in black.
- `ax-reveal` doesn't need an `ax-reveal-bound` anymore.
