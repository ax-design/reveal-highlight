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
            // A finger landing on the screen without moving fires no `pointermove`.
            window.addEventListener('pointerdown', this.handlePointerMove);
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
                // The browser took over the touch for scrolling, keep following
                // the finger with touch events until it leaves the screen.
                if (ev.pointerType === 'touch') {
                    this.touchScrolling = true;
                } else {
                    this.handlePointerLeave();
                }
            });
            window.addEventListener('touchmove', (ev) => {
                if (this.touchScrolling && ev.touches.length) this.handlePointerMove(ev.touches[0]);
            }, { passive: true });
            const handleTouchEnd = (ev: TouchEvent) => {
                if (!this.touchScrolling || ev.touches.length) return;
                this.touchScrolling = false;
                this.handlePointerLeave();
            };
            window.addEventListener('touchend', handleTouchEnd, { passive: true });
            window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        }
    }

    touchScrolling = false;

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

    handlePointerMove = (event: { clientX: number; clientY: number }) => {
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
