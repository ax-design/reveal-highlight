import { RevealBoundaryStore } from './RevealBoundryStore.js';

import { config } from './config.js';

export class RevealStateManager {
    private _currentHashId = 0;
    private _storage: RevealBoundaryStore[] = [];

    private requestedTraverseBoundaries = false;
    cachedMouseX = -1;
    cachedMouseY = -1;

    constructor() {
        if (config.borderDetectionMode === 'experimentalAutoFit') {
            if (typeof Window === 'undefined') return;

            window.addEventListener('pointermove', this.handlePointerMove);
            // This is for touch screen
            // Window.pointerleave won't be triggered if the finger
            // leave the screen, so we use pointer up here.
            window.addEventListener('pointerup', (ev) => {
                if (ev.pointerType !== 'mouse') this.handlePointerLeave();
            });
            // This is for desktop
            // If the mouse leave the window, we need to terminate
            // all animations and clean up the canvas.
            window.addEventListener('pointerleave', (ev) => {
                if (ev.pointerType === 'mouse') this.handlePointerLeave();
            });
            // Handles boundary conditions such as the user scrolling
            // the page, dragging the image, which can cause mouse events
            // to fail, when Reveal should disappear to prevent the 
            // image from getting stuck.
            window.addEventListener('pointercancel', (ev) => {
                console.log('pointer cancel');
                this.handlePointerLeave();
            });
        }
    }

    pointerLeaveScheduled = false;

    handlePointerLeave = () => {
        if (this.pointerLeaveScheduled) return;

        this.pointerLeaveScheduled = true;

        window.requestAnimationFrame(() => {
            for (let i = 0; i < this._storage.length; i++) {
                this._storage[i].onPointerLeaveBoundary();
            }

            this.pointerLeaveScheduled = false;
        });
    }

    handlePointerMove = (event: PointerEvent) => {
        this.cachedMouseX = event.clientX;
        this.cachedMouseY = event.clientY;

        if (!this.requestedTraverseBoundaries) {
            window.requestAnimationFrame(this.traverseBoundaries);
            this.requestedTraverseBoundaries = true;
        }
    };

    traverseBoundaries = () => {
        this.requestedTraverseBoundaries = false;
        for (let i = 0; i < this._storage.length; i++) {
            this._storage[i].onPointerMoveOnScreen(this.cachedMouseX, this.cachedMouseY);
        }
    };

    newBoundary = ($el: HTMLElement) => {
        const hashId = this._currentHashId++;

        const store = new RevealBoundaryStore(hashId, $el);
        this._storage.push(store);

        return store;
    };

    removeBoundary = (store: RevealBoundaryStore) => {
        this._storage = this._storage.filter((x) => x !== store);
    };
}
