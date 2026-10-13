import { RevealBoundaryStore } from './RevealBoundryStore.js';

import type { CachedRevealBitmap } from './utils/types.js';

import { BaseConfig } from './BaseConfig.js';
import { drawReveal, updateRevealGradients } from './painter.js';
import type { ShapeKind } from './painter.js';

export class CanvasConfig extends BaseConfig<HTMLCanvasElement> {
    ctx: CanvasRenderingContext2D | null;

    protected cachedImg: CachedRevealBitmap;

    constructor(store: RevealBoundaryStore, $canvas: HTMLCanvasElement, $container: HTMLElement) {
        super(store, $canvas, $container);

        this.ctx = $canvas.getContext('2d');

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
        };
    }

    updateCachedReveal = () => {
        if (!this.fillDirty) return;
        if (!this.ctx) return;

        const c = this.cachedStyle;
        this._store.updateMaxRadius(c.trueFillRadius[1] * c.borderFillRadius);
        updateRevealGradients(this.ctx, this.cachedImg.cachedReveal, c, this.pxRatio);

        this.fillDirty = false;
    };

    updateCachedBitmap = () => {
        if (!this.ctx) return;
        this.updateCachedReveal();
    };

    // Same sequence the legacy painter used inline: identity transform, shape path, translate
    // the gradient to the pointer, fill.
    private paintShape = (kind: ShapeKind, pattern: CanvasGradient, tx: number, ty: number) => {
        if (!this.ctx) return;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.drawShape(kind === 'ring');
        this.ctx.translate(tx, ty);
        this.ctx.fillStyle = pattern;
        this.ctx.fill();
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
                    /* prettier-ignore-end */
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

    syncSizeToElement = (x: HTMLCanvasElement) => {
        const b = this.cachedBoundingRect;

        // Compare against the backing store size; assigning `width` or
        // `height` resets the bitmap even when the value is unchanged.
        const width = Math.floor(b.width * this.pxRatio);
        const height = Math.floor(b.height * this.pxRatio);

        if (x.width !== width || x.height !== height) {
            x.width = width;
            x.height = height;
            x.style.width = `${b.width}px`;
            x.style.height = `${b.height}px`;
        }
    };

    // Inputs of the last painted frame, a frame with identical inputs is
    // skipped and the canvas keeps its content.
    private paintedRelativeX = NaN;
    private paintedRelativeY = NaN;
    private paintedRectWidth = -1;
    private paintedRectHeight = -1;
    private paintedStyleVersion = -1;
    private paintedAnimation = false;

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

    paint = (_skipSamePointerPositionCheck?: boolean): boolean => {
        const store = this._store;

        if (!this.ctx) return false;

        const animationPlaying = store.animationQueue.includes(this);

        if (!store.mouseInBoundary && !animationPlaying) {
            this.clear();
            return false;
        }

        if (!this.cachedImg.cachedReveal) {
            return false;
        }

        // Read layout before any write to the canvas, so the read never
        // forces a synchronous layout.
        this.cacheBoundingRect();

        const b = this.cachedBoundingRect;

        const relativeX = store.clientX - b.left;
        const relativeY = store.clientY - b.top;

        if (Number.isNaN(relativeX) || Number.isNaN(relativeY)) {
            return false;
        }

        const c = this.cachedStyle;
        this.getTrueFillRadius(c.trueFillRadius);

        const maxRadius = c.trueFillRadius[1];

        const inLeftBound = relativeX + maxRadius > 0;
        const inRightBound = relativeX - maxRadius < b.width;
        const inTopBound = relativeY + maxRadius > 0;
        const inBottomBound = relativeY - maxRadius < b.height;

        const mouseInRenderArea = inLeftBound && inRightBound && inTopBound && inBottomBound;

        if (!mouseInRenderArea && !animationPlaying) {
            this.clear();
            return false;
        }

        this.cacheCanvasPaintingStyle();

        const unchanged =
            this.dirty &&
            !animationPlaying &&
            !this.paintedAnimation &&
            relativeX === this.paintedRelativeX &&
            relativeY === this.paintedRelativeY &&
            b.width === this.paintedRectWidth &&
            b.height === this.paintedRectHeight &&
            this.styleVersion === this.paintedStyleVersion;

        if (unchanged) {
            return false;
        }

        this.syncSizeToElement(this.element);
        this.updateCachedBitmap();

        this.dirty = true;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.paintedWidth, this.paintedHeight);

        this.paintedWidth = b.width * this.pxRatio;
        this.paintedHeight = b.height * this.pxRatio;

        this.paintedRelativeX = relativeX;
        this.paintedRelativeY = relativeY;
        this.paintedRectWidth = b.width;
        this.paintedRectHeight = b.height;
        this.paintedStyleVersion = this.styleVersion;
        this.paintedAnimation = animationPlaying;

        drawReveal({
            ctx: this.ctx,
            pxRatio: this.pxRatio,
            width: b.width,
            height: b.height,
            relativeX,
            relativeY,
            originX: 0,
            originY: 0,
            mouseInBoundary: store.mouseInBoundary,
            mouseInRenderArea,
            style: c,
            gradients: this.cachedImg.cachedReveal,
            press: {
                mousePressed: this.mousePressed,
                mouseReleased: this.mouseReleased,
                hasMouseUp: !!(this.mouseUpClientX && this.mouseUpClientY),
                mouseUpX: (this.mouseUpClientX || 0) - b.left,
                mouseUpY: (this.mouseUpClientY || 0) - b.top,
                mouseDownAnimateLogicFrame: this.mouseDownAnimateLogicFrame,
            },
            hasBorder: c.borderWidth !== 0,
            paintShape: this.paintShape,
        });

        return true;
    };
}
