import { RevealBoundaryStore } from './RevealBoundryStore.js';

import type { CachedRevealPath } from './utils/types.js';

import { BaseConfig } from './BaseConfig.js';

export class SvgConfig extends BaseConfig<SVGSVGElement> {
    protected cachedImg: CachedRevealPath;

    constructor(store: RevealBoundaryStore, $svg: SVGSVGElement, $container: HTMLElement) {
        super(store, $svg, $container);
        this._store = store;

        const cachedPath = {
            borderReveal: $svg.querySelector('#borderPath') as SVGPathElement,
            fillReveal: $svg.querySelector('#fillPath') as SVGPathElement,
            rippleReveal: $svg.querySelector('#ripplePath') as SVGPathElement,
        };

        const cachedGradient = {
            borderReveal: $svg.querySelector('#borderGrad') as SVGRadialGradientElement,
            fillReveal: $svg.querySelector('#fillGrad') as SVGRadialGradientElement,
            rippleReveal: $svg.querySelector('#rippleGrad') as SVGRadialGradientElement,
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

    updateCachedBitmap = () => {
    }

    updateCachedReveal = () => {
        const c = this.cachedStyle;
        const stops = this.cachedImg.cachedGradientStop;
        stops.borderReveal[0].style.stopColor = c.borderColor;
        stops.borderReveal[1].style.stopColor = c.borderColor;
        stops.borderReveal[0].style.stopOpacity = c.opacity.toString();
        stops.borderReveal[1].style.stopOpacity = '0';

        stops.fillReveal[0].style.stopColor = c.hoverLightColor;
        stops.fillReveal[1].style.stopColor = c.hoverLightColor;
        stops.fillReveal[0].style.stopOpacity = (c.opacity * 0.5).toString();
        stops.fillReveal[1].style.stopOpacity = '0';

        stops.rippleReveal[0].style.stopColor = c.pressAnimationColor;
        stops.rippleReveal[1].style.stopColor = c.pressAnimationColor;
        stops.rippleReveal[2].style.stopColor = c.pressAnimationColor;

        const grads = this.cachedImg.cachedGradient;
        const isAbsoluteFill = c.trueFillRadius[0] === -1;
        grads.borderReveal.r.baseVal.value = isAbsoluteFill
            ? c.borderFillRadius
            : c.borderFillRadius * c.trueFillRadius[1];
        grads.fillReveal.r.baseVal.value = isAbsoluteFill
            ? c.hoverLightFillRadius
            : c.hoverLightFillRadius * c.trueFillRadius[0];
    };

    private updateAnimateGrd = (frame: number, x: number, y: number, radius: number) => {
        const { opacity } = this.cachedStyle;

        const _innerAlpha = opacity * (0.2 - frame);
        const _outerAlpha = opacity * (0.1 - frame * 0.07);
        const _outerBorder = 0.1 + frame * 0.8;

        const innerAlpha = _innerAlpha < 0 ? 0 : _innerAlpha;
        const outerAlpha = _outerAlpha < 0 ? 0 : _outerAlpha;
        let outerBorder = 0;
        outerBorder = _outerBorder > 1 ? 1 : _outerBorder;
        outerBorder = _outerBorder < 0 ? 0 : _outerBorder;

        console.log(outerBorder);

        const stops = this.cachedImg.cachedGradientStop;
        stops.rippleReveal[0].style.stopOpacity = innerAlpha.toString();
        stops.rippleReveal[1].style.stopOpacity = outerAlpha.toString();
        stops.rippleReveal[2].style.stopOpacity = '0';

        stops.rippleReveal[0].offset.baseVal = 0;
        stops.rippleReveal[1].offset.baseVal = outerBorder * 0.55;
        stops.rippleReveal[2].offset.baseVal = outerBorder;

        const grads = this.cachedImg.cachedGradient;
        grads.rippleReveal.r.baseVal.value = radius;
        grads.rippleReveal.cx.baseVal.value = x;
        grads.rippleReveal.cy.baseVal.value = y;
    };

    private updateGradientPosition = (x: number, y: number) => {
        const grads = this.cachedImg.cachedGradient;

        grads.borderReveal.cx.baseVal.value = x;
        grads.borderReveal.cy.baseVal.value = y;

        grads.fillReveal.cx.baseVal.value = x;
        grads.fillReveal.cy.baseVal.value = y;
    }

    private drawShape = (hollow: boolean, $target: SVGPathElement) => {
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

        const rwlf = c.withLeftBorderFactor ? 0 : 1;
        const rwrf = c.withRightBorderFactor ? 0 : 1;
        const rwtf = c.withTopBorderFactor ? 0 : 1;
        const rwbf = c.withBottomBorderFactor ? 0 : 1;

        const ntlc = !c.withTopBorderFactor && !c.withLeftBorderFactor;
        const ntrc = !c.withTopBorderFactor && !c.withRightBorderFactor;
        const nblc = !c.withBottomBorderFactor && !c.withLeftBorderFactor;
        const nbrc = !c.withBottomBorderFactor && !c.withRightBorderFactor;

        const tl2 = bw < tl ? tl - bw : 0;
        const tr2 = bw < tr ? tr - bw : 0;
        const bl2 = bw < bl ? bl - bw : 0;
        const br2 = bw < br ? br - bw : 0;

        let d = '';

        // Step 1: Starting point
        d += hollow ? `M ${tl}, 0 ` : `M ${bw}, ${tl2 + bw} `;

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
                        h ${-w + bl + br} 
                        a ${bl}, ${bl} 0 0 1 ${-bl}, ${-bl} 
                        v ${-h + tr + br} 
                        a ${tl}, ${tl} 0 0 1 ${tl}, ${-tl} 
                        Z 
                    `;
                }
                // Step 2-2: This is the inner path, drawing anti-clockwise
                d += `
                    M ${bw * wlf}, ${tl2 + bw} 
                    v ${h - tl2 - bl2 - bw * 2 + rwbf * bw} 
                    a ${bl2}, ${bl2} 0 0 0 ${bl2}, ${bl2} 
                    h ${w - bl2 - br2 - bw * 2 + rwlf * bw + rwrf * bw} 
                    a ${br2}, ${br2} 0 0 0 ${br2}, ${-br2} 
                    v ${-h + tr2 + br2 + bw * 2 - rwtf * bw - rwbf * bw} 
                    a ${tr2}, ${tr2} 0 0 0 ${-tr2}, ${-tr2} 
                    h ${-w + bl2 + br2 + bw * 2 - rwlf * bw - rwrf * bw} 
                    a ${tl2}, ${tl2} 0 0 0 ${-tl2}, ${tl2} 
                    L ${bw * wlf}, ${tl2 + bw} 
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
                        h ${-w + tr + br} 
                        l ${-bl} ${-bl} 
                        v ${-h + tr + br} 
                        l ${tl} ${-tl} 
                        Z 
                    `;
                }
                // // Step 2-2: This is the inner path, drawing anti-clockwise
                d += `
                    M ${bw}, ${tl2 + bw} 
                    ${rwlf ? `h ${-bw}` : ''} 
                    v ${h - tl2 - bl2 - bw * 2} 
                    ${rwlf ? `h ${bw}` : ''} 
                    ${nblc ? `l ${-bw} 0` : ''} 
                    l ${bl2} ${bl2} 
                    ${nblc ? `l ${bw} 0` : ''} 
                    ${rwbf ? `v ${bw}` : ''} 
                    h ${w - bl2 - br2 - bw * 2} 
                    ${rwbf ? `v ${-bw}` : ''} 
                    ${nbrc ? `l ${bw} 0` : ''} 
                    l ${br2} ${-br2} 
                    ${nbrc ? `l ${-bw} 0` : ''} 
                    ${rwrf ? `h ${bw}` : ''} 
                    v ${-h + tl2 + bl2 + bw * 2} 
                    ${rwrf ? `h ${-bw}` : ''} 
                    ${ntrc ? `l 0 ${-bw}` : ''} 
                    l ${-tr2} ${-tr2} 
                    ${ntrc ? `l 0 ${bw}` : ''} 
                    ${rwtf ? `v ${-bw}` : ''} 
                    h ${-w + bl2 + br2 + bw * 2}  
                    ${rwtf ? `v ${bw}` : ''} 
                    ${ntlc ? `l 0 ${-bw}` : ''} 
                    l ${-tl2} ${tl2} 
                    ${ntlc ? `l 0 ${bw}` : ''} 
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
                    M ${bw * wlf}, ${bw * wtf}
                    v ${h - wtf * bw - wbf * bw}
                    h ${w - wlf * bw - wrf * bw}
                    v ${-h + wtf * bw + wbf * bw}
                    h ${-w + wlf * bw + wrf * bw}
                `;
        }
        // Step 3: Close the path
        if (c.borderDecorationType === 'miter') {
            d += hollow ? `L ${bw}, ${bw}` : `z`;
        } else {
            d += hollow ? `L ${tl2 + bw}, ${tl2 + bw}` : `z`;
        }

        $target.setAttribute('d', d);
    };

    syncSizeToElement = (x: SVGSVGElement) => {
        const b = this.cachedBoundingRect;
        const width = x.width.baseVal;
        const height = x.height.baseVal;

        if (width.value !== b.width || height.value !== b.height) {
            width.value = b.width;
            height.value = b.height;
        }
    };

    clear = () => {
        if (!this.dirty) return false;

        const paths = this.cachedImg.cachedPath;

        paths.borderReveal.style.fill = 'transparent';
        paths.fillReveal.style.fill = 'transparent';
        paths.rippleReveal.style.fill = 'transparent';
    }

    paint = (skipSamePointerPositionCheck?: boolean): boolean => {
        const store = this._store;

        const animationPlaying = store.animationQueue.includes(this);
        const samePosition = store.clientX === store.paintedClientX && store.clientY === store.paintedClientY;

        if (samePosition && !skipSamePointerPositionCheck && !animationPlaying) {
            return false;
        }

        if (!store.mouseInBoundary && !animationPlaying) {
            return false;
        }

        if (!this.cachedImg.cachedReveal) {
            return false;
        }

        this.dirty = true;

        this.syncSizeToElement(this.element);
        this.cacheBoundingRect();

        const b = this.cachedBoundingRect;

        const relativeX = store.clientX - b.left;
        const relativeY = store.clientY - b.top;

        if (Number.isNaN(relativeX) || Number.isNaN(relativeY)) {
            return false;
        }

        const c = this.cachedStyle;
        this.getTrueFillRadius(c.trueFillRadius);

        this.paintedWidth = b.width;
        this.paintedHeight = b.height;

        const maxRadius = c.trueFillRadius[1];

        const inLeftBound = relativeX + maxRadius > 0;
        const inRightBound = relativeX - maxRadius < b.width;
        const inTopBound = relativeY + maxRadius > 0;
        const inBottomBound = relativeY - maxRadius < b.height;

        const mouseInRenderArea = inLeftBound && inRightBound && inTopBound && inBottomBound;

        if (!mouseInRenderArea && !animationPlaying) {
            return false;
        }

        this.cacheCanvasPaintingStyle();
        this.updateCachedReveal();

        this.updateGradientPosition(relativeX, relativeY);

        this.drawShape(true, this.cachedImg.cachedPath.borderReveal);
        this.drawShape(false, this.cachedImg.cachedPath.fillReveal);
        this.drawShape(false, this.cachedImg.cachedPath.rippleReveal);

        if (store.mouseInBoundary) {
            const mouseInElement = relativeX > 0 && relativeY > 0 && relativeX < b.width && relativeY < b.height;

            if (c.hoverLight && mouseInElement) {
                // draw fill.
                this.cachedImg.cachedPath.fillReveal.style.fill = 'url(#fillGrad)';
            } else if (this.cachedImg.cachedPath.fillReveal.style.fill !== 'transparent') {
                this.cachedImg.cachedPath.fillReveal.style.fill = 'transparent';
            }

            const diffuse = (c.diffuse && mouseInRenderArea) || mouseInElement;
            if (c.borderWidth !== 0 && diffuse) {
                // Draw border.
                this.cachedImg.cachedPath.borderReveal.style.fill = 'url(#borderGrad)';
            } else if (this.cachedImg.cachedPath.borderReveal.style.fill !== 'transparent') {
                this.cachedImg.cachedPath.borderReveal.style.fill = 'transparent';
            }
        }

        if (c.pressAnimation && this.mousePressed && this.mouseDownAnimateLogicFrame) {
            const grdRadius =
                c.pressAnimationFillMode === 'constrained' ? c.trueFillRadius[1] : Math.max(b.width, b.height);

            this.mouseReleased && this.mouseUpClientX && this.mouseUpClientY
                ? this.updateAnimateGrd(
                    this.mouseDownAnimateLogicFrame,
                    this.mouseUpClientX - b.left,
                    this.mouseUpClientY - b.top,
                    grdRadius
                )
                : this.updateAnimateGrd(
                    this.mouseDownAnimateLogicFrame,
                    relativeX,
                    relativeY,
                    grdRadius
                )
            this.cachedImg.cachedPath.rippleReveal.style.fill = 'url(#borderGrad)';
        } else if (this.cachedImg.cachedPath.rippleReveal.style.fill !== 'transparent') {
            this.cachedImg.cachedPath.rippleReveal.style.fill = 'transparent';
        }

        return true;
    };
}
