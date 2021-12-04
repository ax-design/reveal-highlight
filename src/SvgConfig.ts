import { RevealBoundaryStore } from './RevealBoundryStore.js';

import type { CachedRevealPath } from './utils/types.js';

import { BaseConfig } from './BaseConfig.js';

const createEmptyPath = () => document.createElementNS('http://www.w3.org/2000/svg', 'path');

export class SvgConfig extends BaseConfig<SVGElement> {
    protected cachedImg: CachedRevealPath;

    constructor(store: RevealBoundaryStore, $svg: SVGElement, $container: HTMLElement) {
        super(store, $svg, $container);
        this._store = store;

        const cachedPath = {
            borderReveal: createEmptyPath(),
            fillReveal: createEmptyPath(),
        };

        this.cachedImg = {
            cachedReveal: {
                borderReveal: {
                    radiusFactor: -1,
                    radius: -1,
                    color: 'INVALID',
                    opacity: 0,
                    pattern: null,
                },
                fillReveal: {
                    radiusFactor: -1,
                    radius: -1,
                    color: 'INVALID',
                    opacity: 0,
                    pattern: null,
                },
            },
            cachedPath,
        };
    }

    updateCachedReveal = () => {
    };

    updateCachedBitmap = () => {
    };

    updateAnimateGrd = (frame: number, grd: CanvasGradient) => {
    };

    private drawShape = (hollow: boolean) => {
    };

    clear = () => {
    }

    paint = (skipSamePointerPositionCheck?: boolean): boolean => {
        return false
    };
}
