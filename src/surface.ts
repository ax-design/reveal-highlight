// Entry for <ax-surface> users: `import { registerRevealLayer } from '@ax-design/reveal-highlight/surface'`.
// Kept apart from the main entry so legacy <ax-reveal> users do not load the surface stack.
import { registerLayer } from '@ax-design/surface';
import { createRevealLayer } from './surfaceLayer.js';

export { REVEAL_SCHEMA, createRevealLayer } from './surfaceLayer.js';

let registered = false;

export function registerRevealLayer(): void {
    if (registered) return;
    registered = true;
    registerLayer('reveal', createRevealLayer);
}
