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
        const b = this.cachedBoundingRect;
        const w = b.width;
        const h = b.height;

        const c = this.cachedStyle;
        const bw = c.borderWidth;

        const tl = c.topLeftBorderDecorationRadius;
        const tr = c.topRightBorderDecorationRadius;
        const bl = c.bottomLeftBorderDecorationRadius;
        const br = c.bottomRightBorderDecorationRadius;

        const wlf = c.withLeftBorderFactor;
        const wrf = c.withRightBorderFactor;
        const wtf = c.withTopBorderFactor;
        const wbf = c.withBottomBorderFactor;

        const tl2 = bw < tl ? tl - bw : 0;
        const tr2 = bw < tr ? tr - bw : 0;
        const bl2 = bw < bl ? bl - bw : 0;
        const br2 = bw < br ? br - bw : 0;

        let d = '';


        // Step 1: Starting point
        d += hollow ? `M ${tl * wlf}, 0 ` : `M ${bw}, ${tl2 * wtf + bw} `;

        switch (c.borderDecorationType) {
            // Oh... Fuck again...
            case 'round':
                // Step 2: Draw shape
                if (hollow) {
                    // Step 2-1: This is outer path, drawing clockwise
                    d += `
                        h ${w - tl - tr} 
                        a ${tr}, ${tr} 0 0 1 ${tr}, ${tr} 
                        v ${h - tr - br} 
                        a ${br}, ${br} 0 0 1 ${-br}, ${br} 
                        h ${-h + tr + br} 
                        a ${bl}, ${bl} 0 0 1 ${-bl}, ${-bl} 
                        v ${-h + tr + br} 
                        a ${tl}, ${tl} 0 0 1 ${tl}, ${-tl} 
                        Z 
                    `;
                }
                // Step 2-2: This is the inner path, drawing anti-clockwise
                d += `
                    M ${bw}, ${tl2 + bw} 
                    v ${h - tl2 - bl2 - bw * 2} 
                    a ${bl2}, ${bl2} 0 0 0 ${bl2}, ${bl2} 
                    h ${w - bl2 - br2 - bw * 2} 
                    a ${br2}, ${br2} 0 0 0 ${br2}, ${-br2} 
                    v ${-h + tl2 + bl2 + bw * 2} 
                    a ${tr2}, ${tr2} 0 0 0 ${-tr2}, ${-tr2} 
                    h ${-w + bl2 + br2 + bw * 2} 
                    a ${tl2}, ${tl2} 0 0 0 ${-tl2}, ${tl2} 
                `;
                break;
            case 'bevel':
                if (hollow) {
                    // Step 2-1: This is outer path, drawing clockwise
                    d += `
                        h ${w - tl - tr}
                        l ${tr} ${tr} 
                        v ${h - tr - br} 
                        l ${-br} ${br} 
                        h ${-h + tr + br} 
                        l ${-bl} ${-bl} 
                        v ${-h + tr + br} 
                        l ${tl} ${-tl} 
                        Z 
                    `;
                }
                // Step 2-2: This is the inner path, drawing anti-clockwise
                d += `
                    M ${bw}, ${tl2 + bw} 
                    v ${h - tl2 - bl2 - bw * 2} 
                    l ${bl2} ${bl2} 
                    h ${w - bl2 - br2 - bw * 2} 
                    l ${br2} ${-br2} 
                    v ${-h + tl2 + bl2 + bw * 2} 
                    l ${-tr2} ${-tr2} 
                    h ${-w + bl2 + br2 + bw * 2} 
                    l ${-tl2} ${tl2} 
                `;
                break;
            case 'miter':
                // Step 2: Draw shape
                if (hollow) {
                    // Step 2-1: This is outer path, drawing clockwise
                    d += `
                        M 0, 0 
                        h ${w} 
                        v ${h} 
                        h ${0 - w} 
                        v ${0 - h}
                        Z
                    `;
                }
                // Step 2-2: This is the inner path, drawing anti-clockwise
                d += `
                    M ${bw}, ${bw}
                    v ${h - bw * 2}
                    h ${w - bw * 2}
                    v ${-h + bw * 2}
                    h ${-w + bw * 2}
                `;
        }
        // Step 3: Close the path
        if (c.borderDecorationType === 'miter') {
            d += hollow ? `L ${bw}, ${bw}` : `z`;
        } else {
            d += hollow ? `L ${tl2 + bw}, ${tl2 + bw}` : `z`;
        }
    };

    clear = () => {
    }

    paint = (skipSamePointerPositionCheck?: boolean): boolean => {
        return false
    };
}
