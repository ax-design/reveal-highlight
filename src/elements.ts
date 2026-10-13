// <ax-reveal-provider>, <ax-reveal-bound>, <ax-reveal> and <ax-reveal-ng>, built on the surface
// engine. Markup, CSS properties and register() options are unchanged from the original
// elements; the shape comes from the original --reveal-border-* properties.
import { AxSurface, services } from '@ax-design/surface';
import type { Values } from '@ax-design/surface';
import type { Quad, ShapeSpec } from '@ax-design/shape';
import { LEGACY_SHAPE_SCHEMA, legacyBorderWidths, legacyShapeSpec } from './legacyShape.js';

export type BorderDetectionMode = 'strictEdge' | 'experimentalAutoFit';

export const config: { borderDetectionMode: BorderDetectionMode } = { borderDetectionMode: 'strictEdge' };

// Server-side rendering imports this module without a DOM.
const ElementBase: typeof HTMLElement = typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement);

// Kept for markup compatibility. The surface engine shares one state per page, so a provider no
// longer scopes anything.
export class AxRevealProvider extends ElementBase {
    static readonly ElementName = 'ax-reveal-provider';
}

// Reveals inside a boundary light up only while the pointer is in it: on the element itself in
// strictEdge mode, or within the element grown by the largest light radius of its reveals in
// experimentalAutoFit mode.
export class AxRevealBoundary extends ElementBase {
    static readonly ElementName = 'ax-reveal-bound';
    private hovered = false;
    private maxRadius = 0;
    private rect: DOMRect | null = null;
    private rectTime = -Infinity;

    connectedCallback() {
        this.addEventListener('pointerenter', this.onEnter);
        this.addEventListener('pointerleave', this.onLeave);
    }

    disconnectedCallback() {
        this.removeEventListener('pointerenter', this.onEnter);
        this.removeEventListener('pointerleave', this.onLeave);
        this.hovered = false;
    }

    private onEnter = () => {
        this.hovered = true;
    };

    private onLeave = () => {
        // The browser took over a touch for scrolling; keep following the finger.
        if (services().pointer.touchScrolling) return;
        this.hovered = false;
    };

    // The largest light radius of the reveals inside, like the original updateMaxRadius.
    reportRadius(radius: number) {
        if (radius > this.maxRadius) this.maxRadius = radius;
    }

    pointerInside(): boolean {
        const pointer = services().pointer;
        if (!pointer.present) return false;
        if (config.borderDetectionMode === 'strictEdge') return this.hovered || pointer.touchScrolling;
        // One layout read per frame for all reveals of this boundary.
        const now = performance.now();
        if (!this.rect || now - this.rectTime > 4) {
            this.rect = this.getBoundingClientRect();
            this.rectTime = now;
        }
        const r = this.rect;
        const m = this.maxRadius;
        return pointer.x >= r.left - m && pointer.x <= r.right + m && pointer.y >= r.top - m && pointer.y <= r.bottom + m;
    }
}

function closestBoundary(node: Node): AxRevealBoundary | null {
    for (let n: Node | null = node.parentNode || (node as ShadowRoot).host || null; n; n = n.parentNode || (n as ShadowRoot).host || null) {
        if (n instanceof AxRevealBoundary) return n;
    }
    return null;
}

const REVEAL_STYLE = `
.content, ::slotted(*) { user-drag: none; -webkit-user-drag: none; touch-action: var(--reveal-touch-action, manipulation); user-select: none; -webkit-user-select: none; }
::slotted(button) { outline: none; }
`;

abstract class RevealElement extends AxSurface {
    static schemaKey = 'ax-reveal';
    static extraSchema = LEGACY_SHAPE_SCHEMA;
    private boundary: AxRevealBoundary | null = null;

    constructor() {
        super();
        const style = document.createElement('style');
        style.textContent = REVEAL_STYLE;
        (this.shadowRoot as ShadowRoot).appendChild(style);
    }

    protected abstract layer(): string;

    protected layerNames_(): string[] {
        return [this.layer()];
    }

    protected shapeFor(values: Values, width: number, height: number): ShapeSpec {
        return legacyShapeSpec(values, this, width, height);
    }

    protected borderWidthsFor(values: Values): Quad<number> {
        return legacyBorderWidths(values, this);
    }

    protected pointerAllowed(): boolean {
        const b = this.boundary;
        if (!b) return true;
        const values = this.currentValues;
        if (values) b.reportRadius(this.layerReach() * Math.max(0, values.number('--reveal-border-fill-radius')));
        return b.pointerInside();
    }

    connectedCallback() {
        super.connectedCallback();
        this.boundary = closestBoundary(this);
        this.addEventListener('pointerdown', this.capture);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.boundary = null;
        this.removeEventListener('pointerdown', this.capture);
    }

    // The release arrives here even when the pointer left the element.
    private capture = (event: PointerEvent) => {
        if (this.setPointerCapture) this.setPointerCapture(event.pointerId);
    };
}

export class AxReveal extends RevealElement {
    static readonly ElementName = 'ax-reveal';
    protected layer() {
        return 'reveal';
    }
}

export class AxRevealNg extends RevealElement {
    static readonly ElementName = 'ax-reveal-ng';
    protected layer() {
        return 'reveal-svg';
    }
}
