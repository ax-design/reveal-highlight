import { RevealStateManager } from './RevealStateManager.js';
import { RevealBoundaryStore } from './RevealBoundryStore.js';
import { config } from './config.js';

class ServerSideHTMLElement {
    root = {
        innerHTML: '',
        querySelector: (_x: string) => null,
    }

    attachShadow = () => null;
}

const PatchedHTMLElement =
    typeof globalThis.Window === 'undefined'
        ? ServerSideHTMLElement as unknown as typeof HTMLElement
        : HTMLElement;

export class AxRevealProvider extends PatchedHTMLElement {
    static readonly ElementName = 'ax-reveal-provider';
    readonly stateManager = new RevealStateManager();
}

export class AxRevealBoundary extends PatchedHTMLElement {
    static readonly ElementName = 'ax-reveal-bound';

    static readonly removeStorageEvent = 'removeStorage';
    static readonly attachStorageEvent = 'attachStorage';
    static readonly replaceStorageEvent = 'replaceStorage';

    private root = this.attachShadow({ mode: 'open' });

    static readonly stateManager = new RevealStateManager();

    private _storage!: RevealBoundaryStore | undefined;

    private get storage() {
        return this._storage;
    }

    private set storage(newStorage) {
        const oldStorage = this._storage;

        if (oldStorage) {
            this.dispatchEvent(new CustomEvent(AxRevealBoundary.removeStorageEvent, { detail: oldStorage }));
            AxRevealBoundary.stateManager.removeBoundary(oldStorage);
        }

        if (newStorage) {
            this._storage = newStorage;
            this.dispatchEvent(new CustomEvent(AxRevealBoundary.attachStorageEvent, { detail: newStorage }));
        }

        if (oldStorage && newStorage) {
            this.dispatchEvent(new CustomEvent(AxRevealBoundary.replaceStorageEvent, {
                detail: { old: oldStorage, new: newStorage },
            }));
        }
    }

    public waitForStorage(f: (storage: RevealBoundaryStore) => void) {
        if (this.storage === undefined) {
            this.addEventListener(AxRevealBoundary.attachStorageEvent, () => f(this.storage!), { once: true });
        } else {
            f(this.storage);
        }
    }

    private appendStorage(force = false) {
        if (!force && this.storage) {
            return;
        }

        const parent = this.closest(AxRevealProvider.ElementName) as AxRevealProvider;
        const stateManager = parent ? parent.stateManager : AxRevealBoundary.stateManager;

        this.storage = stateManager.newBoundary(this);
    }

    /**
     * Update the position of your pointer.
     * @param ev Pointer event from the listener.
     */
    updatePointerPosition = (ev: PointerEvent) => {
        this.waitForStorage(storage => {
            storage.clientX = ev.clientX;
            storage.clientY = ev.clientY;
        });
    };

    handlePointerEnter = () => this.waitForStorage(storage => storage.onPointerEnterBoundary());
    handlePointerLeave = () => this.waitForStorage(storage => storage.onPointerLeaveBoundary());
    handlePointerMove = this.updatePointerPosition;
    handlePointerUp = (ev: PointerEvent) => {
        if (ev.pointerType === 'mouse') {
            this.waitForStorage(storage => storage.switchAnimation());
        } else {
            this.waitForStorage(storage => storage.clearAll(false));
        }
    };
    handlePointerDown = (ev: PointerEvent) => this.waitForStorage(storage => {
        this.setPointerCapture(ev.pointerId);
        this.updatePointerPosition(ev);
        storage.initializeAnimation();
    });

    connectedCallback() {
        this.appendStorage(true);
        if (config.borderDetectionMode === 'strictEdge') {
            this.addEventListener('pointerenter', this.handlePointerEnter);
            this.addEventListener('pointerleave', this.handlePointerLeave);
            this.addEventListener('pointermove', this.handlePointerMove);
        }
        this.addEventListener('pointerdown', this.handlePointerDown);
        this.addEventListener('pointerup', this.handlePointerUp);
    }

    disconnectedCallback() {
        this.storage = undefined;
    }

    constructor() {
        super();
        this.root.innerHTML = `
<div>
    <slot></slot>
</div>`
    }
}

export class AxReveal extends PatchedHTMLElement {
    static readonly ElementName = 'ax-reveal';
    private root = this.attachShadow({ mode: 'open' });
    private canvas: HTMLCanvasElement;
    private boundary!: AxRevealBoundary;

    adoptedCallback() {
        this.disconnectedCallback();
        this.connectedCallback();
    }

    disconnectedCallback() {
        this.boundary && this.boundary.waitForStorage(storage => storage.removeReveal(this.canvas));
    }

    connectedCallback() {
        this.boundary = this.closest(AxRevealBoundary.ElementName) as AxRevealBoundary;
        if (!this.boundary)
            throw new SyntaxError('You must use ' + AxRevealBoundary.ElementName + ' as the boundary of reveal highlight!');

        this.boundary.waitForStorage(storage => setTimeout(() => storage.addReveal(this.canvas, this), 0));
    }

    constructor() {
        super();
        this.root.innerHTML = `
<div class="ax-reveal">
    <canvas></canvas>
    <div class="content"><slot></slot></div>
</div>
<style>
    .ax-reveal { display: content; }
    .ax-reveal * { user-drag: none; touch-action: none; user-select: none; }
    .content { position: relative; }
    canvas { top: 0; left: 0; pointer-events: none; width: 100%; height: 100%; position: absolute; }
    :host { display: inline-block; position: relative; }
    :host([block]) { display: block; }
    :host([inline-block]) { display: inline-block; }
    :host([flex]) { display: flex; }
    :host([inline-flex]) { display: inline-flex; }
    :host([grid]) { display: grid; }
    :host([inline-grid]) { display: inline-grid; }
    ::slotted(*) { user-drag: none; touch-action: none; }
    ::slotted(button) { outline:none; }
</style>`;
        this.canvas = this.root.querySelector('canvas')!;
    }
}

export class AxRevealNg extends PatchedHTMLElement {
    static readonly ElementName = 'ax-reveal-ng';
    private root = this.attachShadow({ mode: 'open' });
    private svg: SVGElement;
    private boundary!: AxRevealBoundary;

    adoptedCallback() {
        this.disconnectedCallback();
        this.connectedCallback();
    }

    disconnectedCallback() {
        this.boundary && this.boundary.waitForStorage(storage => storage.removeReveal(this.svg));
    }

    connectedCallback() {
        this.boundary = this.closest(AxRevealBoundary.ElementName) as AxRevealBoundary;
        if (!this.boundary)
            throw new SyntaxError('You must use ' + AxRevealBoundary.ElementName + ' as the boundary of reveal highlight!');

        this.boundary.waitForStorage(storage => setTimeout(() => storage.addReveal(this.svg, this), 0));
    }

    constructor() {
        super();
        this.root.innerHTML = `
<div class="ax-reveal">
    <svg>
        <defs>
            <radialGradient id="borderGrad" gradientUnits="userSpaceOnUse" r="10">
                <stop id="borderCenter" offset="0%" />
                <stop id="borderOut" offset="100%" />
            </radialGradient>
            <radialGradient id="fillGrad" gradientUnits="userSpaceOnUse" r="10">
                <stop id="fillCenter" offset="0%" />
                <stop id="fillOut" offset="100%" />
            </radialGradient>
            <radialGradient id="rippleGrad" gradientUnits="userSpaceOnUse" r="10">
                <stop id="rippleCenter" offset="0%" />
                <stop id="rippleMiddle" offset="0%" />
                <stop id="rippleOut" offset="0%" />
            </radialGradient>
        </defs>
        <path id="borderPath" fill="url(#borderGrad)" />
        <path id="fillPath" fill="url(#fillGrad)" />
        <path id="ripplePath" fill="url(#rippleGrad)" />
    </svg>
    <div class="content"><slot></slot></div>
</div>
<style>
    .ax-reveal { display: content; }
    .ax-reveal * { user-drag: none; touch-action: none; user-select: none; }
    .content { position: relative; }
    svg { top: 0; left: 0; pointer-events: none; width: 100%; height: 100%; position: absolute; }
    :host { display: inline-block; position: relative; }
    :host([block]) { display: block; }
    :host([inline-block]) { display: inline-block; }
    :host([flex]) { display: flex; }
    :host([inline-flex]) { display: inline-flex; }
    :host([grid]) { display: grid; }
    :host([inline-grid]) { display: inline-grid; }
    ::slotted(*) { user-drag: none; touch-action: none; }
    ::slotted(button) { outline:none; }
</style>`;
        this.svg = this.root.querySelector('svg')!;
    }
}

