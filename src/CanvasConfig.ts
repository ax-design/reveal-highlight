import { ComputedStyleStorage, createStorage } from './ComputedStyleStorage.js';
import { RevealBoundaryStore } from './RevealBoundryStore.js';

type BorderDecoration = 'round' | 'bevel' | 'miter';

const borderDecorationTypeSet = new Set(['round', 'bevel', 'miter']);

export interface CachedStyle {
    top: number;
    left: number;
    width: number;
    height: number;
    color: string;
    opacity: number;
    trueFillRadius: number[];
    borderStyle: string;
    borderDecorationType: BorderDecoration;
    borderDecorationSize: number;
    borderWidth: number;
    fillMode: string;
    fillRadius: number;
    diffuse: boolean;
    revealAnimateSpeed: number;
    revealReleasedAccelerateRate: number;
}

/**
 * Cached mask of current reveal effect,
 * will update each time if the size of main canvas changed.
 * @interface CachedMask
 * @property {number} width The width of cached mask
 * @property {number} height The height of cached mask
 * @property {BorderDecoration}  borderDecorationType The shape of the border decoration
 * @property {number}  borderDecorationSize The size of the border decoration
 * @property {HTMLCanvasElement} borderMask Canvas with cached mask of border, to draw rounded and tangential corners
 * @property {HTMLCanvasElement} fillMask Canvas with cached mask of the filling
 */
interface CachedMask {
    width: number;
    height: number;
    borderDecorationType: BorderDecoration;
    borderDecorationSize: number;
}

/**
 * Cached gradient of current reveal effect,
 * will update each time if the color, radius parameter changed.
 * @interface CachedMask
 * @property {number} radius - The radius of the radial gradient
 * @property {string} color - The color of the gradient
 * @property {number} opacity - The central opacity of the radial gradient
 * @property {HTMLCanvasElement} borderReveal Canvas with cached gradient of border
 * @property {HTMLCanvasElement} fillReveal Canvas with cached gradient of reveal
 */
interface CachedReveal {
    radius: number;
    color: string;
    opacity: number;
}

/**
 * Cached border and body pattern, for faster painting on the canvas.
 * @interface CachedRevealBitmap

 * @property {CachedMask} cachedMask cached mask canvases
 * @property {HTMLCanvasElement} cachedCanvas.borderMask Canvas with cached mask of border, to draw rounded and tangential corners
 * @property {HTMLCanvasElement} cachedCanvas.fillMask Canvas with cached mask of the filling
 */
export interface CachedRevealBitmap {
    cachedMask: CachedMask | null;
    cachedReveal: CachedReveal | null;
    cachedCanvas: {
        borderReveal: HTMLCanvasElement;
        fillReveal: HTMLCanvasElement;
        borderMask: HTMLCanvasElement;
        fillMask: HTMLCanvasElement;
    };
    cachedCtx: {
        borderReveal: CanvasRenderingContext2D | null;
        fillReveal: CanvasRenderingContext2D | null;
        borderMask: CanvasRenderingContext2D | null;
        fillMask: CanvasRenderingContext2D | null;
    };
}

const createEmptyCanvas = () => document.createElement('canvas') as HTMLCanvasElement;

export class CanvasConfig {
    protected _store: RevealBoundaryStore;

    pxRatio = window.devicePixelRatio || 1;

    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;

    computedStyle: ComputedStyleStorage;

    paintedWidth = 0;
    paintedHeight = 0;

    bufferCanvas: HTMLCanvasElement = createEmptyCanvas();
    bufferCtx: CanvasRenderingContext2D | null;

    cachedImg: CachedRevealBitmap;

    cachedStyle: CachedStyle = {
        top: -1,
        left: -1,
        width: -1,
        height: -1,
        trueFillRadius: [0, 0],
        color: '',
        opacity: 1,
        borderStyle: '',
        borderDecorationType: 'miter',
        borderDecorationSize: 0,
        borderWidth: 1,
        fillMode: '',
        fillRadius: 0,
        diffuse: true,
        revealAnimateSpeed: 0,
        revealReleasedAccelerateRate: 0,
    };

    mouseUpClientX: number | null = null;
    mouseUpClientY: number | null = null;
    mouseDownAnimateStartFrame: number | null = null;
    mouseDownAnimateCurrentFrame: number | null = null;
    mouseDownAnimateReleasedFrame: number | null = null;
    mouseDownAnimateLogicFrame: number | null = null;
    mousePressed = false;

    mouseReleased = false;

    currentFrameId: any = -1;
    cachedFrameId: any = -2;

    constructor(store: RevealBoundaryStore, $el: HTMLCanvasElement) {
        this._store = store;

        this.canvas = $el;
        this.ctx = $el.getContext('2d');

        const cachedCanvas = {
            borderReveal: createEmptyCanvas(),
            fillReveal: createEmptyCanvas(),
            borderMask: createEmptyCanvas(),
            fillMask: createEmptyCanvas(),
        };

        const cachedCtx = {
            borderReveal: cachedCanvas.borderReveal.getContext('2d'),
            fillReveal: cachedCanvas.fillReveal.getContext('2d'),
            borderMask: cachedCanvas.borderMask.getContext('2d'),
            fillMask: cachedCanvas.fillMask.getContext('2d'),
        };

        this.cachedImg = {
            cachedReveal: null,
            cachedMask: null,
            cachedCanvas,
            cachedCtx,
        };

        this.bufferCtx = this.bufferCanvas.getContext('2d');

        const compat = !!document.documentElement.dataset.revealCompat;
        this.computedStyle = createStorage(this.canvas, compat);
    }

    cacheCanvasPaintingStyle = () => {
        if (this.currentFrameId === this.cachedFrameId) {
            return;
        }

        if (this.computedStyle.size() === 0) {
            return;
        }

        const boundingRect = this.canvas.getBoundingClientRect();

        const colorString = this.computedStyle.getColor('--reveal-color');
        const colorStringMatch = colorString.match(/\((\d+,\s*\d+,\s*\d+)[\s\S]*?\)/);

        const currentStyle = {
            top: Math.round(boundingRect.top),
            left: Math.round(boundingRect.left),
            width: Math.round(boundingRect.width),
            height: Math.round(boundingRect.height),
            color: colorStringMatch && colorStringMatch.length > 1 ? colorStringMatch[1] : '0, 0, 0',
            opacity: this.computedStyle.getNumber('--reveal-opacity'),
            borderStyle: this.computedStyle.get('--reveal-border-style'),
            borderDecorationType: this.computedStyle.get('--reveal-border-decoration-type') as BorderDecoration,
            borderDecorationSize: this.computedStyle.getNumber('--reveal-border-decoration-size'),
            borderWidth: this.computedStyle.getNumber('--reveal-border-width'),
            fillMode: this.computedStyle.get('--reveal-fill-mode'),
            fillRadius: this.computedStyle.getNumber('--reveal-fill-radius'),
            diffuse: this.computedStyle.get('--reveal-diffuse') === 'true',
            revealAnimateSpeed: this.computedStyle.getNumber('--reveal-animate-speed'),
            revealReleasedAccelerateRate: this.computedStyle.getNumber('--reveal-released-accelerate-rate'),
        };

        if (!borderDecorationTypeSet.has(currentStyle.borderDecorationType)) {
            throw new SyntaxError('The value of `--reveal-border-style` must be `relative`, `absolute` or `none`!');
        }

        const { width, height, fillMode, fillRadius } = currentStyle;

        let trueFillRadius = [0, 0];

        switch (fillMode) {
            case 'none':
                break;
            case 'relative':
                trueFillRadius = [width, height].sort((a, b) => a - b).map((x) => x * fillRadius);
                break;
            case 'absolute':
                trueFillRadius = [fillRadius, fillRadius];
                break;
            default:
                throw new SyntaxError('The value of `--reveal-border-style` must be `relative`, `absolute` or `none`!');
        }

        this.cachedStyle = {
            ...currentStyle,
            trueFillRadius,
        };

        this.cachedFrameId = this.currentFrameId;
    };

    updateCachedMask = () => {
        /**
         * What we need to do here:
         * 1. Draw a border mask, since the stroke is centered, we have to calculate the offset
         *    manually, the top-left corner is `0 + borderWidth / 2`, the width is `canvasWidth -
         *    borderWidth`, the height is `canvasHeight - borderHeight`;
         * 2. Draw a fill mask, the top-left corner is `0 + borderWidth`, the width is
         *    `canvasWidth - borderWidth`, make sure you've cleaned the `lineStyle`.
         * 3. Draw gradient of border and fill.
         *
         * Reference this about how to draw round bordered shape:
         * http://jsfiddle.net/robhawkes/gHCJt/
         */

        const { borderDecorationType, borderDecorationSize, borderWidth, width, height } = this.cachedStyle;

        const last = this.cachedImg.cachedMask;
        if (
            borderDecorationSize === last?.borderDecorationSize &&
            borderDecorationType === last?.borderDecorationType
        ) {
            return;
        }

        const $canvas = this.cachedImg.cachedCanvas;

        this.syncSizeToElement($canvas.borderMask);
        this.syncSizeToElement($canvas.fillMask);

        // Draw masks.

        // Some variables will be used frequently
        const beginCoord = borderDecorationSize / 2;
        const ctxWidth = width * this.pxRatio;
        const ctxHeight = height * this.pxRatio;
        const decWidth = ctxWidth - borderDecorationSize;
        const decHeight = ctxHeight - borderDecorationSize;

        // Get context
        const { borderMask: borderCtx, fillMask: fillCtx } = this.cachedImg.cachedCtx;

        if (!borderCtx || !fillCtx) return;

        for (let i of [borderCtx, fillCtx]) {
            i.clearRect(0, 0, ctxWidth, ctxHeight);
            i.lineJoin = borderDecorationType;
            i.lineWidth = borderDecorationSize;
            i.fillStyle = 'black';
        }

        borderCtx.globalCompositeOperation = 'source-over';

        switch (this.cachedStyle.borderStyle) {
            case 'full':
                // Draw the border mask
                borderCtx.fillRect(beginCoord, beginCoord, decWidth, decHeight);
                borderCtx.strokeRect(beginCoord, beginCoord, decWidth, decHeight);
                borderCtx.globalCompositeOperation = 'destination-out';
                borderCtx.fillRect(
                    beginCoord + borderWidth,
                    beginCoord + borderWidth,
                    decWidth - borderWidth * 2,
                    decHeight - borderWidth * 2
                );
                borderCtx.strokeRect(
                    beginCoord + borderWidth,
                    beginCoord + borderWidth,
                    decWidth - borderWidth * 2,
                    decHeight - borderWidth * 2
                );

                // draw fill mask
                fillCtx.fillRect(
                    beginCoord + borderWidth,
                    beginCoord + borderWidth,
                    decWidth - borderWidth,
                    decHeight - borderWidth
                );
                fillCtx.strokeRect(
                    beginCoord + borderWidth,
                    beginCoord + borderWidth,
                    decWidth - borderWidth,
                    decHeight - borderWidth
                );
                break;
            case 'half':
                // Draw the border mask
                borderCtx.lineWidth = borderWidth;
                borderCtx.beginPath();
                borderCtx.moveTo(0, beginCoord);
                borderCtx.lineTo(ctxWidth, beginCoord);
                borderCtx.moveTo(0, ctxHeight - beginCoord);
                borderCtx.lineTo(ctxWidth, ctxHeight - beginCoord);
                borderCtx.stroke();

                // draw the fill mask
                fillCtx.rect(0, borderWidth, decWidth, decHeight - borderWidth);
                break;
            case 'none':
                fillCtx.rect(0, 0, decWidth, decHeight);
                break;

            default:
                throw new SyntaxError('The value of `--reveal-border-style` must be `full`, `half` or `none`!');
        }

        return {
            width,
            height,
            borderDecorationSize,
            borderDecorationType,
        };
    };

    updateCachedReveal = () => {
        const { color, opacity, trueFillRadius } = this.cachedStyle;
        const radius = trueFillRadius[1];
        const size = radius * 2;

        const last = this.cachedImg.cachedReveal;
        if (radius === last?.radius && color == last?.color && opacity == last?.opacity) {
            return;
        }

        const { borderReveal, fillReveal } = this.cachedImg.cachedCanvas;

        this.syncSizeToRevealRadius(borderReveal);
        this.syncSizeToRevealRadius(fillReveal);

        for (const i of [0, 1]) {
            // 0 means border, 1 means fill.
            const canvas = i === 0 ? borderReveal : fillReveal;
            const revealCtx = canvas.getContext('2d');
            if (!revealCtx) return;

            revealCtx.clearRect(0, 0, canvas.width, canvas.height);

            const fillAlpha = i === 0 ? opacity : opacity * 0.5;

            const grd = revealCtx.createRadialGradient(radius, radius, 0, radius, radius, trueFillRadius[i]);

            grd.addColorStop(0, `rgba(${color}, ${fillAlpha})`);
            grd.addColorStop(1, `rgba(${color}, 0.0)`);

            revealCtx.fillStyle = grd;
            revealCtx.clearRect(0, 0, size, size);
            revealCtx.fillRect(0, 0, size, size);
        }

        return {
            radius,
            color,
            opacity,
            borderReveal,
            fillReveal,
        };
    };

    updateCachedBitmap = () => {
        if (!this.ctx) return;

        const cachedMask = this.updateCachedMask();
        const cachedReveal = this.updateCachedReveal();

        if (cachedMask) {
            this.cachedImg.cachedMask = cachedMask;
        }
        if (cachedReveal) {
            this.cachedImg.cachedReveal = cachedReveal;
        }

        // TODO:
        // WHAT DOES THIS LINE OF CODE MEANS?
        // revealCtx.setTransform(this.pxRatio, 0, 0, this.pxRatio, 0, 0);
    };

    mouseInCanvas = () => {
        this.cacheCanvasPaintingStyle();
        const { top, left, width, height } = this.cachedStyle;

        const relativeX = this._store.clientX - left;
        const relativeY = this._store.clientY - top;

        return relativeX > 0 && relativeY > 0 && relativeX < width && relativeY < height;
    };

    syncSizeToElement = (x: HTMLCanvasElement) => {
        const { width, height } = this.cachedStyle;

        x.width = width * this.pxRatio;
        x.height = height * this.pxRatio;
        x.style.width = `${width}px`;
        x.style.height = `${height}px`;
    };

    syncSizeToRevealRadius = (x: HTMLCanvasElement) => {
        const { trueFillRadius } = this.cachedStyle;

        const radius = trueFillRadius[1];
        const size = radius * 2;

        x.width = size * this.pxRatio;
        x.height = size * this.pxRatio;
    };

    getAnimateGrd = (frame: number, grd: CanvasGradient) => {
        const { color, opacity } = this.cachedStyle;

        const _innerAlpha = opacity * (0.2 - frame);
        const _outerAlpha = opacity * (0.1 - frame * 0.07);
        const _outerBorder = 0.1 + frame * 0.8;

        const innerAlpha = _innerAlpha < 0 ? 0 : _innerAlpha;
        const outerAlpha = _outerAlpha < 0 ? 0 : _outerAlpha;
        const outerBorder = _outerBorder > 1 ? 1 : _outerBorder;

        grd.addColorStop(0, `rgba(${color},${innerAlpha})`);
        grd.addColorStop(outerBorder * 0.55, `rgba(${color},${outerAlpha})`);
        grd.addColorStop(outerBorder, `rgba(${color}, 0)`);
    };

    paint = (force?: boolean, debug?: boolean) => {
        const store = this._store;

        const animationPlaying = store.animationQueue.has(this);
        const samePosition = store.clientX === store.paintedClientX && store.clientY === store.paintedClientY;

        if (samePosition && !animationPlaying && !force) {
            return;
        }

        if (!this.ctx) return;
        if (!this.bufferCtx) return;

        this.ctx.clearRect(0, 0, this.paintedWidth, this.paintedHeight);

        store.dirty = false;

        if (!store.mouseInBoundary && !animationPlaying) {
            return;
        }

        if (!this.cachedImg.cachedReveal || !this.cachedImg.cachedMask) {
            return;
        }

        this.cacheCanvasPaintingStyle();
        this.updateCachedBitmap();

        const { top, left, width, height, trueFillRadius, borderStyle, fillMode } = this.cachedStyle;

        this.syncSizeToElement(this.canvas);

        this.paintedWidth = width;
        this.paintedHeight = height;

        const mouseInCanvas = this.mouseInCanvas();

        if (!mouseInCanvas && !this.cachedStyle.diffuse && !animationPlaying) {
            return;
        }

        const relativeX = store.clientX - left;
        const relativeY = store.clientY - top;
        const fillRadius = this.cachedImg.cachedReveal.radius;
        const putX = relativeX - fillRadius;
        const putY = relativeY - fillRadius;

        if (isNaN(relativeX) || isNaN(relativeY)) {
            return;
        }

        // this.ctx.setTransform(this.pxRatio, 0, 0, this.pxRatio, 0, 0);
        // this.bufferCtx.setTransform(this.pxRatio, 0, 0, this.pxRatio, 0, 0);

        /**
         * We have to refactor the code here, use `drawImage`, it's much faster:
         * https://stackoverflow.com/questions/3952856/why-is-putimagedata-so-slow
         *
         * Use `globalCompositeOperation` to draw mask, reference this:
         * https://www.w3schools.com/jsref/canvas_globalcompositeoperation.asp
         *
         * Notice that we need a "workspace canvas" to mask the cached gardient,
         * then transfer it into the main canvas, it's pretty tricky, we should
         * benchmark it, if the performance is not ideal, we have to roll back to
         * previous version.
         */

        this.syncSizeToRevealRadius(this.bufferCanvas);

        this.ctx.clearRect(0, 0, width, height);

        if (store.mouseInBoundary) {
            if (borderStyle !== 'none') {
                this.bufferCtx.clearRect(0, 0, width, height);
                this.bufferCtx.globalCompositeOperation = 'source-over';
                this.bufferCtx.drawImage(this.cachedImg.cachedCanvas.borderMask, 0, 0);
                this.bufferCtx.globalCompositeOperation = 'source-in';
                this.bufferCtx.drawImage(
                    this.cachedImg.cachedCanvas.borderReveal,
                    putX * this.pxRatio,
                    putY * this.pxRatio
                );

                this.ctx.drawImage(this.bufferCanvas, 0, 0);
            }

            if (fillMode !== 'none' && mouseInCanvas) {
                this.bufferCtx.clearRect(0, 0, width, height);
                this.bufferCtx.globalCompositeOperation = 'source-over';
                this.bufferCtx.drawImage(this.cachedImg.cachedCanvas.fillMask, 0, 0);
                this.bufferCtx.globalCompositeOperation = 'source-in';
                this.bufferCtx.drawImage(
                    this.cachedImg.cachedCanvas.fillReveal,
                    putX * this.pxRatio,
                    putY * this.pxRatio
                );

                this.ctx.drawImage(this.bufferCanvas, 0, 0);
            }
        }

        if (!this.mousePressed || !this.mouseDownAnimateLogicFrame) {
            return;
        }

        this.bufferCtx.clearRect(0, 0, width, height);
        this.bufferCtx.globalCompositeOperation = 'source-over';
        this.bufferCtx.drawImage(this.cachedImg.cachedCanvas.fillMask, 0, 0);
        this.bufferCtx.globalCompositeOperation = 'source-in';
        const animateGrd =
            this.mouseReleased && this.mouseUpClientX && this.mouseUpClientY
                ? this.bufferCtx.createRadialGradient(
                      this.mouseUpClientX - left,
                      this.mouseUpClientY - top,
                      0,
                      this.mouseUpClientX - left,
                      this.mouseUpClientY - top,
                      trueFillRadius[1]
                  )
                : this.bufferCtx.createRadialGradient(relativeX, relativeY, 0, relativeX, relativeY, trueFillRadius[1]);

        this.getAnimateGrd(this.mouseDownAnimateLogicFrame, animateGrd);
        this.bufferCtx.fillStyle = animateGrd;
        this.bufferCtx.fillRect(0, 0, width, height);

        this.ctx.drawImage(this.bufferCanvas, 0, 0);
    };
}
