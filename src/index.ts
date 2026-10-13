// @ax-design/reveal-highlight: the Reveal Highlight of the Axiom Design System.
//
// <ax-reveal> and <ax-reveal-ng> run on the @ax-design/surface engine. Their markup, CSS
// properties and register() options are the same as before.
import { register as registerSurface } from '@ax-design/surface';
import { AxReveal, AxRevealBoundary, AxRevealNg, AxRevealProvider, config } from './elements.js';
import type { BorderDetectionMode } from './elements.js';
import { registerRevealLayer } from './surface.js';
import { MAGIC_DEFAULT_COLOR } from './variables.js';

export { AxReveal, AxRevealBoundary, AxRevealNg, AxRevealProvider } from './elements.js';
export type { BorderDetectionMode } from './elements.js';
export { registerRevealLayer } from './surface.js';

export interface AxRevealHighlightRegisterOptions {
    // Deprecated, no effect: values that cannot be registered fall back to their initial values.
    compat?: boolean;
    borderDetectionMode?: BorderDetectionMode;
}

// The original definitions. They are a permanent contract: older copies of this package may
// have registered them first, and the first registration wins.
const PROPERTIES = [
    { name: '--reveal-color', syntax: '<color>', initialValue: 'rgb(0, 0, 0)', inherits: true },
    { name: '--reveal-opacity', syntax: '<number>', initialValue: '0.26', inherits: true },
    { name: '--reveal-border-color', syntax: `<color>|${MAGIC_DEFAULT_COLOR}`, initialValue: MAGIC_DEFAULT_COLOR, inherits: true },
    { name: '--reveal-border-width', syntax: '<length>', initialValue: '1px', inherits: true },
    { name: '--reveal-border-fill-radius', syntax: '<number>', initialValue: '1.5', inherits: true },
    { name: '--reveal-border-decoration-type', syntax: '<custom-ident>', initialValue: 'miter', inherits: true },
    { name: '--reveal-border-decoration-radius', syntax: '<length>', initialValue: '0', inherits: true },
    { name: '--reveal-border-decoration-top-left-radius', syntax: '<length>', initialValue: '-1px', inherits: true },
    { name: '--reveal-border-decoration-top-right-radius', syntax: '<length>', initialValue: '-1px', inherits: true },
    { name: '--reveal-border-decoration-bottom-left-radius', syntax: '<length>', initialValue: '-1px', inherits: true },
    { name: '--reveal-border-decoration-bottom-right-radius', syntax: '<length>', initialValue: '-1px', inherits: true },
    { name: '--reveal-border-left-type', syntax: '<custom-ident>', initialValue: 'line', inherits: true },
    { name: '--reveal-border-right-type', syntax: '<custom-ident>', initialValue: 'line', inherits: true },
    { name: '--reveal-border-top-type', syntax: '<custom-ident>', initialValue: 'line', inherits: true },
    { name: '--reveal-border-bottom-type', syntax: '<custom-ident>', initialValue: 'line', inherits: true },
    { name: '--reveal-hover-light', syntax: '<custom-ident>', initialValue: 'true', inherits: true },
    { name: '--reveal-hover-light-color', syntax: `<color>|${MAGIC_DEFAULT_COLOR}`, initialValue: MAGIC_DEFAULT_COLOR, inherits: true },
    { name: '--reveal-hover-light-fill-radius', syntax: '<number>', initialValue: '1.5', inherits: true },
    { name: '--reveal-hover-light-fill-radius-mode', syntax: '<custom-ident>', initialValue: 'relative', inherits: true },
    { name: '--reveal-diffuse', syntax: '<custom-ident>', initialValue: 'true', inherits: true },
    { name: '--reveal-press-animation', syntax: '<custom-ident>', initialValue: 'true', inherits: true },
    { name: '--reveal-press-animation-color', syntax: `<color>|${MAGIC_DEFAULT_COLOR}`, initialValue: MAGIC_DEFAULT_COLOR, inherits: true },
    { name: '--reveal-press-animation-radius-mode', syntax: '<custom-ident>', initialValue: 'cover', inherits: true },
    { name: '--reveal-press-animation-speed', syntax: '<number>', initialValue: '2000', inherits: true },
    { name: '--reveal-release-animation-accelerate-rate', syntax: '<number>', initialValue: '6', inherits: true },
];

function registerProperties() {
    const css = typeof CSS !== 'undefined' ? (CSS as unknown as { registerProperty?: (d: unknown) => void }) : null;
    if (!css || !css.registerProperty) return;
    for (const definition of PROPERTIES) {
        try {
            css.registerProperty(definition);
        } catch (error) {
            if (!error || (error as Error).name !== 'InvalidModificationError') throw error;
        }
    }
}

let registered = false;

export function register({ borderDetectionMode = 'strictEdge' }: AxRevealHighlightRegisterOptions = {}): void {
    if (registered) {
        console.warn('You have already registered Ax RevealHighlight, please do not call this function repeatedly.');
        return;
    }
    registered = true;
    config.borderDetectionMode = borderDetectionMode;
    registerProperties();
    registerRevealLayer();
    registerSurface();
    for (const element of [AxRevealProvider, AxRevealBoundary, AxReveal, AxRevealNg]) {
        if (!customElements.get(element.ElementName)) customElements.define(element.ElementName, element);
    }
}
