import { AcrylicRevealProvider, AcrylicRevealBoundary, AcrylicReveal } from './CustomElements.js';
export function register() {
    customElements.define(AcrylicRevealProvider.ElementName, AcrylicRevealProvider);
    customElements.define(AcrylicRevealBoundary.ElementName, AcrylicRevealBoundary);
    customElements.define(AcrylicReveal.ElementName, AcrylicReveal);
}
