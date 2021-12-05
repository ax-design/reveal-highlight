import { RevealBoundaryStore } from './RevealBoundryStore.js';

import type { CachedRevealPath } from './utils/types.js';

import { BaseConfig } from './BaseConfig.js';

export class SvgConfig extends BaseConfig<SVGElement> {
    protected cachedImg: CachedRevealPath;

    constructor(store: RevealBoundaryStore, $svg: SVGElement, $container: HTMLElement) {
        super(store, $svg, $container);
        this._store = store;

        const cachedPath = {
            borderReveal: $svg.querySelector('#borderPath') as SVGPathElement,
            fillReveal: $svg.querySelector('#fillPath') as SVGPathElement,
            rippleReveal: $svg.querySelector('#ripplePath') as SVGPathElement,
        };

        const cachedGradient = {
            borderReveal: $svg.querySelector('#borderPath') as SVGRadialGradientElement,
            fillReveal: $svg.querySelector('#fillPath') as SVGRadialGradientElement,
            rippleReveal: $svg.querySelector('#ripplePath') as SVGRadialGradientElement,
        }

        const cachedGradientStop = {
            borderReveal: [
                $svg.querySelector('#borderCenter') as SVGStopElement,
                $svg.querySelector('#borderOut') as SVGStopElement,
            ] as const,
            fillReveal: [
                $svg.querySelector('#fillCenter') as SVGStopElement,
                $svg.querySelector('#fillOut') as SVGStopElement,
            ] as const,
            rippleReveal: [
                $svg.querySelector('#rippleCenter') as SVGStopElement,
                $svg.querySelector('#rippleMiddle') as SVGStopElement,
                $svg.querySelector('#rippleOut') as SVGStopElement,
            ] as const,
        }

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
            cachedGradient,
            cachedGradientStop,
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
