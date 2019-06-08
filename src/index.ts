import { AxRevealProvider, AxRevealBoundary, AxReveal } from './CustomElements.js';
export function register() {
    customElements.define(AxRevealProvider.ElementName, AxRevealProvider);
    customElements.define(AxRevealBoundary.ElementName, AxRevealBoundary);
    customElements.define(AxReveal.ElementName, AxReveal);

    if (window.CSS && CSS.registerProperty) {
        CSS.registerProperty({
            name: '--reveal-color',
            syntax: '<color>',
            initialValue: 'rgb(0,0,0)',
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
    }

}