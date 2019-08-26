import { AxRevealProvider, AxRevealBoundary, AxReveal } from './CustomElements.js';

function registerCustomElements() {
    customElements.define(AxRevealProvider.ElementName, AxRevealProvider);
    customElements.define(AxRevealBoundary.ElementName, AxRevealBoundary);
    customElements.define(AxReveal.ElementName, AxReveal);
}

export function register(compat: boolean = false) {
    if (window.CSS && CSS.registerProperty) {
        CSS.registerProperty({
            name: '--reveal-color',
            syntax: '<color>',
            initialValue: 'rgb(0, 0, 0)',
            inherits: true
        });
        CSS.registerProperty({
            name: '--reveal-opacity',
            syntax: '<number>',
            initialValue: '0.26',
            inherits: true
        });
        CSS.registerProperty({
            name: '--reveal-border-style',
            syntax: '<custom-ident>',
            initialValue: 'full',
            inherits: true
        });
        CSS.registerProperty({
            name: '--reveal-border-width',
            syntax: '<length>',
            initialValue: '1px',
            inherits: true
        });
        CSS.registerProperty({
            name: '--reveal-fill-mode',
            syntax: '<custom-ident>',
            initialValue: 'relative',
            inherits: true
        });
        CSS.registerProperty({
            name: '--reveal-fill-radius',
            syntax: '<number>',
            initialValue: '1.5',
            inherits: true
        });
        CSS.registerProperty({
            name: '--reveal-diffuse',
            syntax: '<custom-ident>',
            initialValue: 'true',
            inherits: true
        });
        CSS.registerProperty({
            name: '--reveal-animate-speed',
            syntax: '<number>',
            initialValue: '2000',
            inherits: true
        });
        CSS.registerProperty({
            name: '--reveal-released-accelerate-rate',
            syntax: '<number>',
            initialValue: '6',
            inherits: true
        });

        registerCustomElements();
    } else if (compat) {
        const root = document.documentElement;

        root.dataset.revealCompat = 'true';

        root.style.setProperty('--reveal-color', 'rgb(0, 0, 0)');
        root.style.setProperty('--reveal-opacity', '0.26');
        root.style.setProperty('--reveal-border-style', 'full');
        root.style.setProperty('--reveal-border-width', '1px');
        root.style.setProperty('--reveal-fill-mode', 'relative');
        root.style.setProperty('--reveal-fill-radius', '1.5');
        root.style.setProperty('--reveal-diffuse', 'true');
        root.style.setProperty('--reveal-animate-speed', '2000');
        root.style.setProperty('--reveal-released-accelerate-rate', '6');

        registerCustomElements();
    } else {
        console.warn('Your browser do NOT support `CSS.registerProperty` method, registration failed!');
        console.warn('If you are the developer, try using `register(true)` to support old browsers.');
    }

}
