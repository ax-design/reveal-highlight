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
            window.addEventListener('pointerdown', this.handlePointerMove);

            window.addEventListener('touchend', () => {
                for (let i = 0; i < this._storage.length; i++) {
                    this._storage[i].onPointerLeaveBoundary();
                }
            });
        }
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
