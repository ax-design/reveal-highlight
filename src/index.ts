import { AxRevealProvider, AxRevealBoundary, AxReveal, AxRevealNg } from './CustomElements.js';
import { config } from './config.js';
import { MAGIC_DEFAULT_COLOR } from './variables.js';

function registerCustomElements() {
    customElements.define(AxRevealProvider.ElementName, AxRevealProvider);
    customElements.define(AxRevealBoundary.ElementName, AxRevealBoundary);
    customElements.define(AxReveal.ElementName, AxReveal);
    customElements.define(AxRevealNg.ElementName, AxRevealNg);
}

export interface AxRevealHighlightRegisterOptions {
    compat: boolean;
    borderDetectionMode: 'strictEdge' | 'experimentalAutoFit';
}

let registered = false;

export function register({
    compat = false,
    borderDetectionMode = 'strictEdge',
}: AxRevealHighlightRegisterOptions) {
    if (registered) {
        console.warn('You have already registered Ax RevealHighlight, please do not call this function repeatedly.');
        return;
    }

    config.borderDetectionMode = borderDetectionMode;
    config.compat = compat;
    registered = true;

    if (window.CSS && window.CSS.registerProperty) {
        window.CSS.registerProperty({
            name: '--reveal-color',
            syntax: '<color>',
            initialValue: 'rgb(0, 0, 0)',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-opacity',
            syntax: '<number>',
            initialValue: '0.26',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-color',
            syntax: `<color>|${MAGIC_DEFAULT_COLOR}`,
            initialValue: MAGIC_DEFAULT_COLOR,
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-width',
            syntax: '<length>',
            initialValue: '1px',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-fill-radius',
            syntax: '<number>',
            initialValue: '1.5',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-type',
            syntax: '<custom-ident>',
            initialValue: 'miter',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-radius',
            syntax: '<length>',
            initialValue: '0',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-top-left-radius',
            syntax: '<length>',
            initialValue: '-1px',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-top-right-radius',
            syntax: '<length>',
            initialValue: '-1px',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-bottom-left-radius',
            syntax: '<length>',
            initialValue: '-1px',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-bottom-right-radius',
            syntax: '<length>',
            initialValue: '-1px',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-left-type',
            syntax: '<custom-ident>',
            initialValue: 'line',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-right-type',
            syntax: '<custom-ident>',
            initialValue: 'line',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-top-type',
            syntax: '<custom-ident>',
            initialValue: 'line',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-border-bottom-type',
            syntax: '<custom-ident>',
            initialValue: 'line',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-hover-light',
            syntax: '<custom-ident>',
            initialValue: 'true',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-hover-light-color',
            syntax: `<color>|${MAGIC_DEFAULT_COLOR}`,
            initialValue: MAGIC_DEFAULT_COLOR,
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-hover-light-fill-radius',
            syntax: '<number>',
            initialValue: '1.5',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-hover-light-fill-radius-mode',
            syntax: '<custom-ident>',
            initialValue: 'relative',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-diffuse',
            syntax: '<custom-ident>',
            initialValue: 'true',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-press-animation',
            syntax: '<custom-ident>',
            initialValue: 'true',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-press-animation-color',
            syntax: `<color>|${MAGIC_DEFAULT_COLOR}`,
            initialValue: MAGIC_DEFAULT_COLOR,
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-press-animation-radius-mode',
            syntax: '<custom-ident>',
            initialValue: 'cover',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-press-animation-speed',
            syntax: '<number>',
            initialValue: '2000',
            inherits: true,
        });
        window.CSS.registerProperty({
            name: '--reveal-release-animation-accelerate-rate',
            syntax: '<number>',
            initialValue: '6',
            inherits: true,
        });

        registerCustomElements();
    } else if (compat) {
        const root = document.documentElement;

        root.style.setProperty('--reveal-color', 'rgb(0, 0, 0)');
        root.style.setProperty('--reveal-opacity', '0.26');
        root.style.setProperty('--reveal-border-color', MAGIC_DEFAULT_COLOR);
        root.style.setProperty('--reveal-border-width', '1px');
        root.style.setProperty('--reveal-border-fill-radius', '1.5');
        root.style.setProperty('--reveal-border-decoration-type', 'miter');
        root.style.setProperty('--reveal-border-decoration-radius', '0');
        root.style.setProperty('--reveal-border-decoration-top-left-radius', '-1');
        root.style.setProperty('--reveal-border-decoration-top-right-radius', '-1');
        root.style.setProperty('--reveal-border-decoration-bottom-left-radius', '-1');
        root.style.setProperty('--reveal-border-decoration-bottom-right-radius', '-1');
        root.style.setProperty('--reveal-border-left-type', 'line');
        root.style.setProperty('--reveal-border-right-type', 'line');
        root.style.setProperty('--reveal-border-top-type', 'line');
        root.style.setProperty('--reveal-border-bottom-type', 'line');
        root.style.setProperty('--reveal-hover-light', 'true');
        root.style.setProperty('--reveal-hover-light-color', MAGIC_DEFAULT_COLOR);
        root.style.setProperty('--reveal-hover-light-fill-radius', '1.5');
        root.style.setProperty('--reveal-hover-light-fill-radius-mode', 'relative');
        root.style.setProperty('--reveal-diffuse', 'true');
        root.style.setProperty('--reveal-press-animation', 'true');
        root.style.setProperty('--reveal-press-animation-radius-mode', 'cover');
        root.style.setProperty('--reveal-press-animation-color', MAGIC_DEFAULT_COLOR);
        root.style.setProperty('--reveal-press-animation-speed', '2000');
        root.style.setProperty('--reveal-release-animation-accelerate-rate', '6');

        registerCustomElements();
    } else {
        console.warn('Your browser do NOT support `CSS.registerProperty` method, registration failed!');
        console.warn('If you are the developer, try using `register(true)` to support old browsers.');
    }
}
