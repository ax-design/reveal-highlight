import { ComputedStyleStorage, createStorage } from './ComputedStyleStorage.js';
import { RevealBoundaryStore } from './RevealBoundryStore.js';

type BorderDecoration = 'round' | 'bevel' | 'miter';

const isValidateBorderDecorationType = (x: string): x is BorderDecoration => {
    if (x === 'round') return true;
    if (x === 'bevel') return true;
    if (x === 'miter') return true;
    return false;
};

const extractRGBValue = (x: string) => {
    let result = '';
    let beginSearch = false;
    let numberPointer = 0;

    for (let i = 0; i < x.length; i++) {
        const char = x[i];
        const charCode = char.charCodeAt(0) - 48;
        const charIsNumber = charCode >= 0 && charCode < 10;

        if (char === ' ') {
            continue;
        }

        if (beginSearch && !charIsNumber && char !== ',' && char !== ')') {
            throw new SyntaxError(`${x} is not a validate color value!`);
        }

        if (!beginSearch && char === '(') {
            beginSearch = true;
            continue;
        }

        if (numberPointer < 2 && char === ')') {
            throw new SyntaxError(`${x} should have at least three color channel`);
        }

        if (char === ',') {
            numberPointer++;
        }

        if (char === ')') {
            return result;
        }

        if (beginSearch) {
            result += char;
        }
    }

    return result;
};

export interface CachedBoundingRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface CachedStyle {
    color: string;
    opacity: number;
    trueFillRadius: [number, number];
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

    currentFrameId: number = -1;

    cachedBoundingRectFrameId: number = -2;

    cachedBoundingRect: CachedBoundingRect = {
        top: -1,
        left: -1,
        width: -1,
        height: -1,
    };

    cachedStyleFrameId: number = -2;

    cachedStyle: CachedStyle = {
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

    cacheBoundingRect = () => {
        if (this.currentFrameId === this.cachedBoundingRectFrameId) {
            return;
        }

        const boundingRect = this.canvas.getBoundingClientRect();

        this.cachedBoundingRect.top = Math.floor(boundingRect.top);
        this.cachedBoundingRect.left = Math.floor(boundingRect.left);
        this.cachedBoundingRect.width = Math.floor(boundingRect.width);
        this.cachedBoundingRect.height = Math.floor(boundingRect.height);
        
        this.cachedBoundingRectFrameId = this.currentFrameId;
    };

    getTrueFillRadius = (
        trueFillRadius = [0, 0] as [number, number],
        fillMode = this.computedStyle.get('--reveal-fill-mode'), 
        fillRadius = this.computedStyle.getNumber('--reveal-fill-radius'),
    ) => {
        const b = this.cachedBoundingRect;
        
        switch (fillMode) {
            case 'none':
                break;
            case 'relative':
                trueFillRadius[0] = Math.min(b.width, b.height) * fillRadius;
                trueFillRadius[1] = Math.max(b.width, b.height) * fillRadius;
                break;
            case 'absolute':
                trueFillRadius[0] = fillRadius;
                trueFillRadius[1] = fillRadius;
                break;
            default:
                throw new SyntaxError('The value of `--reveal-border-style` must be `relative`, `absolute` or `none`!');
        }

        return trueFillRadius;
    }

    cacheCanvasPaintingStyle = () => {
        if (this.currentFrameId === this.cachedStyleFrameId) {
            return;
        }

        if (this.computedStyle.size() === 0) {
            return;
        }

        const colorString = this.computedStyle.getColor('--reveal-color');
        const colorStringMatch = extractRGBValue(colorString);

        const c = this.cachedStyle;

        c.color = colorStringMatch || '0, 0, 0';
        c.opacity = this.computedStyle.getNumber('--reveal-opacity');
        c.borderStyle = this.computedStyle.get('--reveal-border-style');
        c.borderDecorationType = (this.computedStyle.get('--reveal-border-decoration-type') as BorderDecoration) || 'miter';
        c.borderDecorationSize = this.computedStyle.getNumber('--reveal-border-decoration-size') * 2;
        c.borderWidth = this.computedStyle.getNumber('--reveal-border-width');
        c.fillMode = this.computedStyle.get('--reveal-fill-mode');
        c.fillRadius = this.computedStyle.getNumber('--reveal-fill-radius');
        c.diffuse = this.computedStyle.get('--reveal-diffuse') === 'true';
        c.revealAnimateSpeed = this.computedStyle.getNumber('--reveal-animate-speed');
        c.revealReleasedAccelerateRate = this.computedStyle.getNumber('--reveal-released-accelerate-rate');

        this.getTrueFillRadius(c.trueFillRadius, c.fillMode, c.fillRadius);

        if (!isValidateBorderDecorationType(c.borderDecorationType)) {
            throw new SyntaxError(
                'The value of `--reveal-border-decoration-type` must be `round`, `bevel` or `miter`!'
            );
        }

        this.cachedStyleFrameId = this.currentFrameId;
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

        const c = this.cachedStyle;
        const b = this.cachedBoundingRect;
        const borderWidth = c.borderStyle === 'none' ? 0 : this.cachedStyle.borderWidth * this.pxRatio;

        const last = this.cachedImg.cachedMask;

        if (last) {
            if (
                c.borderDecorationSize === last.borderDecorationSize &&
                c.borderDecorationType === last.borderDecorationType
            ) {
                return;
            }
        }

        const $canvas = this.cachedImg.cachedCanvas;

        this.syncSizeToElement($canvas.borderMask);
        this.syncSizeToElement($canvas.fillMask);

        // Draw masks.

        // Some variables will be used frequently
        const ctxWidth = b.width * this.pxRatio;
        const ctxHeight = b.height * this.pxRatio;

        // Get context
        const { borderMask: borderCtx, fillMask: fillCtx } = this.cachedImg.cachedCtx;

        if (!borderCtx || !fillCtx) return;

        for (let i of [borderCtx, fillCtx]) {
            i.clearRect(0, 0, ctxWidth, ctxHeight);
            i.lineJoin = c.borderDecorationType;
            i.fillStyle = 'black';
        }

        borderCtx.globalCompositeOperation = 'source-over';

        switch (c.borderStyle) {
            // I HATE MATH!
            case 'full':
            case 'none':
                // Drawing the border mask:
                // Drawing the outer edge of the shape.
                borderCtx.lineWidth = c.borderDecorationSize * this.pxRatio;

                const geoParams1 = [
                    (c.borderDecorationSize / 2) * this.pxRatio,
                    (c.borderDecorationSize / 2) * this.pxRatio,
                    ctxWidth - c.borderDecorationSize * this.pxRatio,
                    ctxHeight - c.borderDecorationSize * this.pxRatio,
                ] as const;
                borderCtx.fillRect(...geoParams1);
                borderCtx.strokeRect(...geoParams1);

                // Draw the inner part of the shape by remove unnecessary parts.
                borderCtx.globalCompositeOperation = 'destination-out';
                const clippingShapeLineWidth = c.borderDecorationSize * this.pxRatio - borderWidth;
                borderCtx.lineWidth = clippingShapeLineWidth;

                const geoParams2 = [
                    borderWidth + clippingShapeLineWidth / 2,
                    borderWidth + clippingShapeLineWidth / 2,
                    ctxWidth - borderWidth * 2 - clippingShapeLineWidth,
                    ctxHeight - borderWidth * 2 - clippingShapeLineWidth,
                ] as const;
                borderCtx.fillRect(...geoParams2);
                borderCtx.strokeRect(...geoParams2);

                // draw fill mask
                fillCtx.lineWidth = clippingShapeLineWidth;
                fillCtx.fillRect(...geoParams2);
                fillCtx.strokeRect(...geoParams2);
                break;
            case 'half':
                // Draw the border mask
                const beginCoord = (c.borderWidth / 2) * this.pxRatio;

                borderCtx.lineWidth = borderWidth;
                borderCtx.beginPath();
                borderCtx.moveTo(0, beginCoord);
                borderCtx.lineTo(ctxWidth, beginCoord);
                borderCtx.moveTo(0, ctxHeight - beginCoord);
                borderCtx.lineTo(ctxWidth, ctxHeight - beginCoord);
                borderCtx.stroke();

                // draw the fill mask
                fillCtx.rect(0, borderWidth, ctxWidth, ctxHeight - borderWidth * 2);
                break;

            default:
                throw new SyntaxError('The value of `--reveal-border-style` must be `full`, `half` or `none`!');
        }

        return {
            width: b.width,
            height: b.height,
            borderDecorationSize: c.borderDecorationSize,
            borderDecorationType: c.borderDecorationType,
        };
    };

    updateCachedReveal = () => {
        const c = this.cachedStyle;
        const radius = c.trueFillRadius[1] * this.pxRatio;
        const size = radius * 2;
        console.log(c);

        const last = this.cachedImg.cachedReveal;
        if (last) {
            if (radius === last.radius && c.color == last.color && c.opacity == last.opacity) {
                return;
            }
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

            const fillAlpha = i === 0 ? c.opacity : c.opacity * 0.5;

            const grd = revealCtx.createRadialGradient(radius, radius, 0, radius, radius, c.trueFillRadius[i]);

            grd.addColorStop(0, `rgba(${c.color}, ${fillAlpha})`);
            grd.addColorStop(1, `rgba(${c.color}, 0.0)`);

            revealCtx.fillStyle = grd;
            revealCtx.clearRect(0, 0, size, size);
            revealCtx.fillRect(0, 0, size, size);
        }

        return {
            radius,
            color: c.color,
            opacity: c.opacity,
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
        const b = this.cachedBoundingRect;

        const relativeX = this._store.clientX - b.left;
        const relativeY = this._store.clientY - b.top;

        return relativeX > 0 && relativeY > 0 && relativeX < b.width && relativeY < b.height;
    };

    syncSizeToElement = (x: HTMLCanvasElement) => {
        const b = this.cachedBoundingRect;

        if (x.width !== b.width || x.height !== b.height) {
            x.width = b.width * this.pxRatio;
            x.height = b.height * this.pxRatio;
            x.style.width = `${b.width}px`;
            x.style.height = `${b.height}px`;
        }
    };

    syncSizeToRevealRadius = (x: HTMLCanvasElement) => {
        const { trueFillRadius } = this.cachedStyle;

        const radius = trueFillRadius[1];
        const size = radius * 2 * this.pxRatio;

        if (x.width !== size || x.height !== size) {
            x.width = size;
            x.height = size;
        }
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

    paint = (force?: boolean, debug?: boolean): boolean => {
        const store = this._store;

        const animationPlaying = store.animationQueue.includes(this);
        const samePosition = store.clientX === store.paintedClientX && store.clientY === store.paintedClientY;

        if (samePosition && !animationPlaying && !force) {
            return false;
        }

        if (!this.ctx) return false;
        if (!this.bufferCtx) return false;

        this.ctx.clearRect(0, 0, this.paintedWidth, this.paintedHeight);

        store.dirty = false;

        if (!store.mouseInBoundary && !animationPlaying) {
            return false;
        }

        if (!this.cachedImg.cachedReveal || !this.cachedImg.cachedMask) {
            return false;
        }

        this.syncSizeToElement(this.canvas);
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

        const maxRadius = Math.max(c.trueFillRadius[0], c.trueFillRadius[1]);

        const exceedLeftBound = relativeX + maxRadius > 0;
        const exceedRightBound = relativeX - maxRadius < b.width;
        const exceedTopBound = relativeY + maxRadius > 0;
        const exceedBottomBound = relativeY - maxRadius < b.height;

        const mouseInRenderArea = exceedLeftBound && exceedRightBound && exceedTopBound && exceedBottomBound;

        if (!mouseInRenderArea && !animationPlaying) {
            return false;
        }

        this.cacheCanvasPaintingStyle();
        this.updateCachedBitmap();

        const fillRadius = this.cachedImg.cachedReveal.radius;
        const putX = Math.floor(relativeX * this.pxRatio - fillRadius);
        const putY = Math.floor(relativeY * this.pxRatio - fillRadius);

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

        if (store.mouseInBoundary) {
            if (c.borderStyle !== 'none') {
                // Draw border.
                this.bufferCtx.clearRect(0, 0, b.width * this.pxRatio, b.height * this.pxRatio);
                this.bufferCtx.globalCompositeOperation = 'source-over';
                this.bufferCtx.drawImage(this.cachedImg.cachedCanvas.borderMask, 0, 0);
                this.bufferCtx.globalCompositeOperation = 'source-in';
                this.bufferCtx.drawImage(this.cachedImg.cachedCanvas.borderReveal, putX, putY);

                this.ctx.drawImage(this.bufferCanvas, 0, 0);
            }

            const mouseInCanvas = relativeX > 0 && relativeY > 0 && relativeX < b.width && relativeY < b.height;

            if (c.fillMode !== 'none' && mouseInCanvas) {
                // draw fill.
                this.bufferCtx.clearRect(0, 0, b.width * this.pxRatio, b.height * this.pxRatio);
                this.bufferCtx.globalCompositeOperation = 'source-over';
                this.bufferCtx.drawImage(this.cachedImg.cachedCanvas.fillMask, 0, 0);
                this.bufferCtx.globalCompositeOperation = 'source-in';
                this.bufferCtx.drawImage(this.cachedImg.cachedCanvas.fillReveal, putX, putY);

                this.ctx.drawImage(this.bufferCanvas, 0, 0);
            }
        }

        if (!this.mousePressed || !this.mouseDownAnimateLogicFrame) {
            return true;
        }

        this.bufferCtx.clearRect(0, 0, b.width * this.pxRatio, b.height * this.pxRatio);
        this.bufferCtx.globalCompositeOperation = 'source-over';
        this.bufferCtx.drawImage(this.cachedImg.cachedCanvas.fillMask, 0, 0);
        this.bufferCtx.globalCompositeOperation = 'source-in';
        const animateGrd =
            this.mouseReleased && this.mouseUpClientX && this.mouseUpClientY
                ? this.bufferCtx.createRadialGradient(
                      this.mouseUpClientX - b.left,
                      this.mouseUpClientY - b.top,
                      0,
                      this.mouseUpClientX - b.left,
                      this.mouseUpClientY - b.top,
                      c.trueFillRadius[1]
                  )
                : this.bufferCtx.createRadialGradient(
                      relativeX,
                      relativeY,
                      0,
                      relativeX,
                      relativeY,
                      c.trueFillRadius[1]
                  );

        this.getAnimateGrd(this.mouseDownAnimateLogicFrame, animateGrd);
        this.bufferCtx.fillStyle = animateGrd;
        this.bufferCtx.fillRect(0, 0, b.width, b.height);

        this.ctx.drawImage(this.bufferCanvas, 0, 0);
        return true;
    };
}
