import { AxRevealProvider, AxRevealBoundary, AxReveal } from './CustomElements.js';
export function register() {
    customElements.define(AxRevealProvider.ElementName, AxRevealProvider);
    customElements.define(AxRevealBoundary.ElementName, AxRevealBoundary);
    customElements.define(AxReveal.ElementName, AxReveal);
}
