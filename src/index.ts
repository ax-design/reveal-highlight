import { AxRevealProvider, AxRevealBoundary, AxReveal } from './CustomElements.js';

function registerCustomElements() {
    customElements.define(AxRevealProvider.ElementName, AxRevealProvider);
    customElements.define(AxRevealBoundary.ElementName, AxRevealBoundary);
    customElements.define(AxReveal.ElementName, AxReveal);
}

export function register(compat: boolean = false) {
    if (window.CSS && window.CSS.registerProperty) {
        window.CSS.registerProperty({
            name: '--reveal-color',
            syntax: '<color>',
            initialValue: 'rgb(0, 0, 0)',
            inherits: true
        });
        window.CSS.registerProperty({
            name: '--reveal-opacity',
            syntax: '<number>',
            initialValue: '0.26',
            inherits: true
        });
        window.CSS.registerProperty({
            name: '--reveal-border-style',
            syntax: '<custom-ident>',
            initialValue: 'full',
            inherits: true
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-type',
            syntax: '<custom-ident>',
            initialValue: 'miter',
            inherits: true
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-radius',
            syntax: '<length>',
            initialValue: '4px',
            inherits: false
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-top-left-radius',
            syntax: '<length>',
            initialValue: '-1px',
            inherits: false
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-top-right-radius',
            syntax: '<length>',
            initialValue: '-1px',
            inherits: false
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-bottom-left-radius',
            syntax: '<length>',
            initialValue: '-1px',
            inherits: false
        });
        window.CSS.registerProperty({
            name: '--reveal-border-decoration-bottom-right-radius',
            syntax: '<length>',
            initialValue: '-1px',
            inherits: false
        });
        window.CSS.registerProperty({
            name: '--reveal-border-width',
            syntax: '<length>',
            initialValue: '1px',
            inherits: true
        });
        window.CSS.registerProperty({
            name: '--reveal-fill-mode',
            syntax: '<custom-ident>',
            initialValue: 'relative',
            inherits: true
        });
        window.CSS.registerProperty({
            name: '--reveal-fill-radius',
            syntax: '<number>',
            initialValue: '1.5',
            inherits: true
        });
        window.CSS.registerProperty({
            name: '--reveal-diffuse',
            syntax: '<custom-ident>',
            initialValue: 'true',
            inherits: true
        });
        window.CSS.registerProperty({
            name: '--reveal-animate-speed',
            syntax: '<number>',
            initialValue: '2000',
            inherits: true
        });
        window.CSS.registerProperty({
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
        root.style.setProperty('--reveal-border-decoration-type', 'miter');
        root.style.setProperty('--reveal-border-decoration-radius', '4');
        root.style.setProperty('--reveal-border-decoration-top-left-radius', '-1');
        root.style.setProperty('--reveal-border-decoration-top-right-radius', '-1');
        root.style.setProperty('--reveal-border-decoration-bottom-left-radius', '-1');
        root.style.setProperty('--reveal-border-decoration-bottom-right-radius', '-1');
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
