// Reveal layers for <ax-surface>: `layers="reveal"` (canvas) and `layers="reveal-svg"` (SVG).
import { registerLayer } from '@ax-design/surface';
import { createRevealLayer } from './surfaceLayer.js';
import { createRevealSvgLayer } from './svgLayer.js';

export { createRevealLayer } from './surfaceLayer.js';
export { createRevealSvgLayer } from './svgLayer.js';
export { REVEAL_SCHEMA } from './revealStyle.js';

let registered = false;

export function registerRevealLayer(): void {
    if (registered) return;
    registered = true;
    registerLayer('reveal', createRevealLayer);
    registerLayer('reveal-svg', createRevealSvgLayer);
}
