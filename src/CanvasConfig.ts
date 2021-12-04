import { RevealBoundaryStore } from './RevealBoundryStore.js';

import type { CachedRevealBitmap } from './utils/types.js';

import { BaseConfig } from './BaseConfig.js';

const createEmptyCanvas = () => document.createElement('canvas') as HTMLCanvasElement;

export class CanvasConfig extends BaseConfig<HTMLCanvasElement> {
    ctx: CanvasRenderingContext2D | null;

    protected cachedImg: CachedRevealBitmap;

    constructor(store: RevealBoundaryStore, $canvas: HTMLCanvasElement, $container: HTMLElement) {
        super(store, $canvas, $container);

        this.ctx = $canvas.getContext('2d');

        const cachedCanvas = {
            borderReveal: createEmptyCanvas(),
            fillReveal: createEmptyCanvas(),
        };

        const cachedCtx = {
            borderReveal: cachedCanvas.borderReveal.getContext('2d'),
            fillReveal: cachedCanvas.fillReveal.getContext('2d'),
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
            cachedCanvas,
            cachedCtx,
        };
    }

    updateCachedReveal = () => {
        const c = this.cachedStyle;
        const radius = c.trueFillRadius[1] * this.pxRatio;
        const size = radius * 2;

        const lastStyle = this.cachedImg.cachedReveal;

        const { borderReveal, fillReveal } = this.cachedImg.cachedCanvas;
        const { borderReveal: borderRevealCtx, fillReveal: fillRevealCtx } = this.cachedImg.cachedCtx;

        for (let i = 0; i < 2; i++) {
            // 0 means border, 1 means hover light.
            //-----------------------------------------
            // Last rendered style.
            const ls = i === 0 ? lastStyle.borderReveal : lastStyle.fillReveal;
            const color = i === 0 ? c.borderColor : c.hoverLightColor;
            const fillRadiusFactor = i === 0 ? c.borderFillRadius : c.hoverLightFillRadius;

            const doNotNeedUpdateReveal =
                color === ls.color && c.opacity === ls.opacity && fillRadiusFactor === ls.radiusFactor;
            if (doNotNeedUpdateReveal) return;

            if (doNotNeedUpdateReveal) continue;

            const reveal = i === 0 ? borderReveal : fillReveal;
            const ctx = i === 0 ? borderRevealCtx : fillRevealCtx;

            this.syncSizeToRevealRadius(reveal, fillRadiusFactor);

            if (!ctx) continue;

            ctx.clearRect(0, 0, reveal.width, reveal.height);

            const fillAlpha = i === 0 ? c.opacity : c.opacity * 0.5;
            const trueRadius = radius * fillRadiusFactor;
            const grd = ctx.createRadialGradient(trueRadius, trueRadius, 0, trueRadius, trueRadius, trueRadius);

            grd.addColorStop(0, `rgba(${color}, ${fillAlpha})`);
            grd.addColorStop(1, `rgba(${color}, 0.0)`);

            const trueSize = size * fillRadiusFactor;
            ctx.fillStyle = grd;
            ctx.clearRect(0, 0, trueSize, trueSize);
            ctx.fillRect(0, 0, trueSize, trueSize);

            ls.radius = trueRadius;
            ls.radiusFactor = fillRadiusFactor;
            ls.color = color;
            ls.opacity = c.opacity;

            if (!this.ctx) continue;
            ls.pattern = this.ctx.createPattern(reveal, 'no-repeat');
        }
    };

    updateCachedBitmap = () => {
        if (!this.ctx) return;
        this.updateCachedReveal();
    };

    updateAnimateGrd = (frame: number, grd: CanvasGradient) => {
        const { pressAnimationColor, opacity } = this.cachedStyle;

        const _innerAlpha = opacity * (0.2 - frame);
        const _outerAlpha = opacity * (0.1 - frame * 0.07);
        const _outerBorder = 0.1 + frame * 0.8;

        const innerAlpha = _innerAlpha < 0 ? 0 : _innerAlpha;
        const outerAlpha = _outerAlpha < 0 ? 0 : _outerAlpha;
        let outerBorder = 0;
        outerBorder = _outerBorder > 1 ? 1 : _outerBorder;
        outerBorder = _outerBorder < 0 ? 0 : _outerBorder;

        grd.addColorStop(0, `rgba(${pressAnimationColor},${innerAlpha})`);
        grd.addColorStop(outerBorder * 0.55, `rgba(${pressAnimationColor},${outerAlpha})`);
        grd.addColorStop(outerBorder, `rgba(${pressAnimationColor}, 0)`);
    };

    private drawShape = (hollow: boolean) => {
        if (!this.ctx) return;

        const b = this.cachedBoundingRect;
        const w = b.width * this.pxRatio;
        const h = b.height * this.pxRatio;

        const c = this.cachedStyle;
        const bw = c.borderWidth * this.pxRatio;

        const tl = c.topLeftBorderDecorationRadius * this.pxRatio;
        const tr = c.topRightBorderDecorationRadius * this.pxRatio;
        const bl = c.bottomLeftBorderDecorationRadius * this.pxRatio;
        const br = c.bottomRightBorderDecorationRadius * this.pxRatio;

        const wlf = c.withLeftBorderFactor;
        const wrf = c.withRightBorderFactor;
        const wtf = c.withTopBorderFactor;
        const wbf = c.withBottomBorderFactor;

        const tl2 = bw < tl ? tl - bw : 0;
        const tr2 = bw < tr ? tr - bw : 0;
        const bl2 = bw < bl ? bl - bw : 0;
        const br2 = bw < br ? br - bw : 0;

        this.ctx.beginPath();

        switch (c.borderDecorationType) {
            // Oh... Fuck... It's painful...
            case 'round':
                // outer
                this.ctx.moveTo(tl, 0);
                this.ctx.arcTo(w, 0, w, h, tr);
                this.ctx.lineTo(w, h - br);
                this.ctx.arcTo(w, h, br, h, br);
                this.ctx.lineTo(bl, h);
                this.ctx.arcTo(0, h, 0, br, bl);
                this.ctx.lineTo(0, tl);
                this.ctx.arcTo(0, 0, tl, 0, tl);

                if (hollow) {
                    /* prettier-ignore-start */
                    // inner
                    /**
                     +-①----⑧-+
                     ②        ⑦
                     |        |
                     ③        ⑥
                     +-④----⑤-+
                     */
                    //              x                    y                   r         p
                    this.ctx.moveTo(tl2, bw * wtf); // ①
                    this.ctx.arcTo(bw * wlf, bw * wtf, bw * wlf, tl2 + bw * wtf, tl2); // ②
                    this.ctx.lineTo(bw * wlf, h - bw * wbf - bl2); // ③
                    this.ctx.arcTo(bw * wlf, h - bw * wbf, bw * wlf + bl2, h - bw * wbf, bl2); // ④
                    this.ctx.lineTo(w - bw * wrf - br2, h - bw * wbf); // ⑤
                    this.ctx.arcTo(w - bw * wrf, h - bw * wbf, w - bw * wrf, h - bw * wbf - br2, br2); // ⑥
                    this.ctx.lineTo(w - bw * wrf, bw * wtf + tr2); // ⑦
                    this.ctx.arcTo(w - bw * wrf, bw * wtf, w - bw * wrf - tr2, bw * wtf, tr2); // ⑧
                    this.ctx.lineTo(tl2, bw * wtf); // ①
                    /* prettier-ignore-start */
                }
                break;
            case 'bevel':
                // outer
                this.ctx.moveTo(tl, 0);
                this.ctx.lineTo(w - tr, 0);
                this.ctx.lineTo(w, tr);
                this.ctx.lineTo(w, h - br);
                this.ctx.lineTo(w - br, h);
                this.ctx.lineTo(bl, h);
                this.ctx.lineTo(0, h - bl);
                this.ctx.lineTo(0, tl);
                this.ctx.lineTo(tl, 0);
                this.ctx.lineTo(w - tr, 0);

                if (hollow) {
                    // inner
                    /**
                     +-①----⑧-+
                     ②        ⑦
                     |        |
                     ③        ⑥
                     +-④----⑤-+
                     */
                    //              x                    y                       p
                    this.ctx.moveTo(tl2 + bw * wlf, bw * wtf); // ①
                    this.ctx.lineTo(bw * wlf, tl2 + bw * wtf); // ②
                    this.ctx.lineTo(bw * wlf, h - bl2 - bw * wbf); // ③
                    this.ctx.lineTo(bw * wlf + bl2, h - bw * wbf); // ④
                    this.ctx.lineTo(w - br2 - bw * wrf, h - bw * wbf); // ⑤
                    this.ctx.lineTo(w - bw * wrf, h - br2 - bw * wbf); // ⑥
                    this.ctx.lineTo(w - bw * wrf, tr2 + bw * wtf); // ⑦
                    this.ctx.lineTo(w - tr2 - bw * wrf, bw * wtf); // ⑧
                    this.ctx.lineTo(tl2 + bw * wrf, bw * wtf); // ①
                }
                break;
            case 'miter':
                // outer
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(w, 0);
                this.ctx.lineTo(w, h);
                this.ctx.lineTo(0, h);
                this.ctx.lineTo(0, 0);

                if (hollow) {
                    // inner
                    /**
                     ①--------④
                     |        |
                     |        |
                     |        |
                     ②--------③
                     */
                    //              x              y                 p
                    this.ctx.moveTo(bw * wlf, bw * wtf); // ①
                    this.ctx.lineTo(bw * wlf, h - bw * wbf); // ②
                    this.ctx.lineTo(w - bw * wrf, h - bw * wbf); // ③
                    this.ctx.lineTo(w - bw * wrf, bw * wtf); // ④
                    this.ctx.lineTo(bw * wlf, bw * wtf); // ①
                }
                break;
            default:
        }

        this.ctx.closePath();
    };

    clear = () => {
        if (!this.ctx) return false;
        if (!this.dirty) return false;

        const { width, height } = this.cachedBoundingRect;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(
            0,
            0,
            width * window.devicePixelRatio,
            height * window.devicePixelRatio,
        );
        this.dirty = false;
        return true;
    }

    paint = (skipSamePointerPositionCheck?: boolean): boolean => {
        const store = this._store;

        const animationPlaying = store.animationQueue.includes(this);
        const samePosition = store.clientX === store.paintedClientX && store.clientY === store.paintedClientY;

        if (samePosition && !skipSamePointerPositionCheck && !animationPlaying) {
            return false;
        }

        if (!this.ctx) return false;

        this.dirty = true;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(
            0, 0,
            this.paintedWidth,
            this.paintedHeight
        );

        if (!store.mouseInBoundary && !animationPlaying) {
            return false;
        }

        if (!this.cachedImg.cachedReveal) {
            return false;
        }

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

        this.paintedWidth = b.width * this.pxRatio;
        this.paintedHeight = b.height * this.pxRatio;

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
        this.updateCachedBitmap();

        if (store.mouseInBoundary) {
            const mouseInCanvas = relativeX > 0 && relativeY > 0 && relativeX < b.width && relativeY < b.height;

            const fillPattern = this.cachedImg.cachedReveal.fillReveal.pattern;
            if (c.hoverLight && mouseInCanvas && fillPattern) {
                // draw fill.
                const radius = this.cachedImg.cachedReveal.fillReveal.radius;
                const putX = Math.floor(relativeX * this.pxRatio - radius);
                const putY = Math.floor(relativeY * this.pxRatio - radius);
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                this.drawShape(false);
                this.ctx.translate(putX, putY);
                this.ctx.fillStyle = fillPattern;
                this.ctx.fill();
            }

            const diffuse = (c.diffuse && mouseInRenderArea) || mouseInCanvas;
            const borderPattern = this.cachedImg.cachedReveal.borderReveal.pattern;
            if (c.borderWidth !== 0 && borderPattern && diffuse) {
                // Draw border.
                const radius = this.cachedImg.cachedReveal.borderReveal.radius;
                const putX = Math.floor(relativeX * this.pxRatio - radius);
                const putY = Math.floor(relativeY * this.pxRatio - radius);
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                this.drawShape(true);
                this.ctx.translate(putX, putY);
                this.ctx.fillStyle = borderPattern;
                this.ctx.fill();
            }
        }

        if (c.pressAnimation && this.mousePressed && this.mouseDownAnimateLogicFrame) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            const grdRadius =
                c.pressAnimationFillMode === 'constrained' ? c.trueFillRadius[1] : Math.max(b.width, b.height);
            // prettier-ignore
            const animateGrd =
                this.mouseReleased && this.mouseUpClientX && this.mouseUpClientY
                    ? this.ctx.createRadialGradient(
                        (this.mouseUpClientX - b.left) * this.pxRatio,
                        (this.mouseUpClientY - b.top) * this.pxRatio,
                        0,
                        (this.mouseUpClientX - b.left) * this.pxRatio,
                        (this.mouseUpClientY - b.top) * this.pxRatio,
                        grdRadius * this.pxRatio
                    )
                    : this.ctx.createRadialGradient(
                        relativeX * this.pxRatio,
                        relativeY * this.pxRatio,
                        0,
                        relativeX * this.pxRatio,
                        relativeY * this.pxRatio,
                        grdRadius * this.pxRatio
                    );
            this.updateAnimateGrd(this.mouseDownAnimateLogicFrame, animateGrd);

            this.drawShape(false);
            this.ctx.fillStyle = animateGrd;
            this.ctx.fill();
        }

        return true;
    };
}
