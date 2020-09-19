import { createStorage } from './ComputedStyleStorage.js';
import { RevealBoundaryStore } from './RevealBoundryStore.js';

export interface CachedStyle {
    top: number;
    left: number;
    width: number;
    height: number;
    color: string;
    opacity: number;
    trueFillRadius: number[];
    borderStyle: string;
    borderWidth: number;
    fillMode: string;
    fillRadius: number;
    diffuse: boolean;
    revealAnimateSpeed: number;
    revealReleasedAccelerateRate: number;
}

export interface CachedRevealBitmap {
    radius: number;
    color: string;
    opacity: number;
    bitmaps: ImageData[];
}

export class CanvasConfig {
    protected _store: RevealBoundaryStore;

    pxRatio = window.devicePixelRatio || 1;

    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;

    paintedWidth = 0;
    paintedHeight = 0;

    revealCanvas: HTMLCanvasElement;

    cachedRevealBitmap: CachedRevealBitmap = {
        radius: 0,
        color: '',
        opacity: 0,
        bitmaps: [] as ImageData[],
    };

    cachedStyle: CachedStyle = {
        top: -1,
        left: -1,
        width: -1,
        height: -1,
        trueFillRadius: [0, 0],
        color: '',
        opacity: 1,
        borderStyle: '',
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

        this.revealCanvas = document.createElement('canvas');
    }

    cacheCanvasPaintingStyle = () => {
        if (this.currentFrameId === this.cachedFrameId) {
            return;
        }

        const compat = !!document.documentElement.dataset.revealCompat;
        const computedStyle = createStorage(this.canvas, compat);

        if (computedStyle.size() === 0) {
            return;
        }

        const boundingRect = this.canvas.getBoundingClientRect();

        const colorString = computedStyle.getColor('--reveal-color');
        const colorStringMatch = colorString.match(/\((\d+,\s*\d+,\s*\d+)[\s\S]*?\)/);

        const currentStyle = {
            top: Math.round(boundingRect.top),
            left: Math.round(boundingRect.left),
            width: Math.round(boundingRect.width),
            height: Math.round(boundingRect.height),
            color: colorStringMatch && colorStringMatch.length > 1 ? colorStringMatch[1] : '0, 0, 0',
            opacity: computedStyle.getNumber('--reveal-opacity'),
            borderStyle: computedStyle.get('--reveal-border-style'),
            borderWidth: computedStyle.getNumber('--reveal-border-width'),
            fillMode: computedStyle.get('--reveal-fill-mode'),
            fillRadius: computedStyle.getNumber('--reveal-fill-radius'),
            diffuse: computedStyle.get('--reveal-diffuse') === 'true',
            revealAnimateSpeed: computedStyle.getNumber('--reveal-animate-speed'),
            revealReleasedAccelerateRate: computedStyle.getNumber('--reveal-released-accelerate-rate'),
        };

        const { width, height, fillMode, fillRadius } = currentStyle;

        let trueFillRadius = [0, 0];

        switch (fillMode) {
            case 'none':
                break;
            case 'relative':
                trueFillRadius = [width, height].sort((a, b) => a - b).map(x => x * fillRadius);
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

    cacheRevealBitmaps = () => {
        if (!this.ctx)
            return;

        const { color, opacity, trueFillRadius } = this.cachedStyle;

        const radius = trueFillRadius[1];
        const size = radius * 2;

        const last = this.cachedRevealBitmap;
        if (radius === last.radius && color == last.color && opacity == last.opacity) {
            return;
        }

        this.cachedRevealBitmap = {
            radius, color, opacity,
            bitmaps: [],
        };

        this.revealCanvas.width = size * this.pxRatio;
        this.revealCanvas.height = size * this.pxRatio;

        for (const i of [0, 1]) {
            // 0 means border, 1 means fill.
            const revealCtx = this.revealCanvas.getContext('2d');
            if (!revealCtx)
                return;

            revealCtx.setTransform(this.pxRatio, 0, 0, this.pxRatio, 0, 0)

            const fillAlpha = i === 0 ? opacity : (opacity * 0.5);

            const grd = revealCtx.createRadialGradient(
                radius, radius, 0,
                radius, radius, trueFillRadius[i],
            );

            grd.addColorStop(0, `rgba(${color}, ${fillAlpha})`);
            grd.addColorStop(1, `rgba(${color}, 0.0)`);

            revealCtx.fillStyle = grd;
            revealCtx.clearRect(0, 0, size, size);
            revealCtx.fillRect(0, 0, size, size);

            const bitmap = revealCtx.getImageData(0, 0, size * this.pxRatio, size * this.pxRatio);

            this.cachedRevealBitmap.bitmaps.push(bitmap);
        }
    };

    mouseInCanvas = () => {
        this.cacheCanvasPaintingStyle();
        const { top, left, width, height } = this.cachedStyle;

        const relativeX = this._store.clientX - left;
        const relativeY = this._store.clientY - top;

        return relativeX > 0
            && relativeY > 0
            && relativeX < width
            && relativeY < height;
    };

    getAnimateGrd = (frame: number, grd: CanvasGradient) => {
        if (!this.ctx)
            return;

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

        if (!this.ctx)
            return;

        this.ctx.clearRect(0, 0, this.paintedWidth, this.paintedHeight);

        store.dirty = false;

        if (!store.mouseInBoundary && !animationPlaying) {
            return;
        }

        if (this.cachedRevealBitmap.bitmaps.length < 2) {
            return;
        }

        this.cacheCanvasPaintingStyle();
        this.cacheRevealBitmaps();

        const { top, left, width, height, trueFillRadius, borderStyle, borderWidth, fillMode } = this.cachedStyle;

        this.canvas.width = width * this.pxRatio;
        this.canvas.height = height * this.pxRatio;

        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.paintedWidth = width;
        this.paintedHeight = height;

        const mouseInCanvas = this.mouseInCanvas();

        if (!mouseInCanvas && !this.cachedStyle.diffuse && !animationPlaying) {
            return;
        }

        let fillX = 0,
            fillY = 0,
            fillW = 0,
            fillH = 0;

        switch (borderStyle) {
            case 'full':
                fillX = borderWidth;
                fillY = borderWidth;
                fillW = width - 2 * borderWidth;
                fillH = height - 2 * borderWidth;
                break;

            case 'half':
                fillX = 0;
                fillY = borderWidth;
                fillW = width;
                fillH = height - 2 * borderWidth;
                break;

            case 'none':
                fillX = 0;
                fillY = 0;
                fillW = width;
                fillH = height;
                break;

            default:
                throw new SyntaxError('The value of `--reveal-border-style` must be `full`, `half` or `none`!');
        }

        const relativeX = store.clientX - left;
        const relativeY = store.clientY - top;
        const fillRadius = this.cachedRevealBitmap.radius;
        const putX = relativeX - fillRadius;
        const putY = relativeY - fillRadius;

        if (isNaN(relativeX) || isNaN(relativeY)) {
            return;
        }

        this.ctx.setTransform(this.pxRatio, 0, 0, this.pxRatio, 0, 0);

        if (store.mouseInBoundary) {
            if (borderStyle !== 'none') {
                this.ctx.putImageData(
                    this.cachedRevealBitmap.bitmaps[0],
                    putX * this.pxRatio, putY * this.pxRatio,
                );
                this.ctx.clearRect(fillX, fillY, fillW, fillH);
            }

            if (fillMode !== 'none' && mouseInCanvas) {
                this.ctx.putImageData(
                    this.cachedRevealBitmap.bitmaps[1],
                    putX * this.pxRatio, putY * this.pxRatio,
                    (fillX - putX) * this.pxRatio, (fillY - putY) * this.pxRatio,
                    fillW * this.pxRatio, fillH * this.pxRatio,
                );
            }
        }

        if (!this.mousePressed || !this.mouseDownAnimateLogicFrame) {
            return;
        }

        let animateGrd;

        if (this.mouseReleased && this.mouseUpClientX && this.mouseUpClientY) {
            animateGrd = this.ctx.createRadialGradient(
                this.mouseUpClientX - left,
                this.mouseUpClientY - top,
                0,
                this.mouseUpClientX - left,
                this.mouseUpClientY - top,
                trueFillRadius[1],
            );
        } else {
            animateGrd = this.ctx.createRadialGradient(
                relativeX,
                relativeY,
                0,
                relativeX,
                relativeY,
                trueFillRadius[1],
            );
        }

        this.getAnimateGrd(this.mouseDownAnimateLogicFrame, animateGrd);

        this.ctx.fillStyle = animateGrd;
        this.ctx.fillRect(fillX, fillY, fillW * 1.5, fillH * 1.5);
    };
}
