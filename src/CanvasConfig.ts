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
    cacheCanvasSize: number;
    borderStyle: string;
    borderWidth: number;
    fillMode: string;
    fillRadius: number;
    diffuse: boolean;
    revealAnimateSpeed: number;
    revealReleasedAccelerateRate: number;
}

export interface CachedRevealBitmap {
    width: number;
    height: number;
    color: string;
    opacity: number;
    bitmaps: ImageData[];
}

export class CanvasConfig {
    protected _store: RevealBoundaryStore;

    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;

    width = 0;
    height = 0;

    cachedRevealBitmap: CachedRevealBitmap = {
        width: 0,
        height: 0,
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
        cacheCanvasSize: -1,
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

        const cacheCanvasSize = trueFillRadius[1] * 2;

        this.cachedStyle = {
            ...currentStyle,
            trueFillRadius,
            cacheCanvasSize,
        };

        this.cachedFrameId = this.currentFrameId;
    };

    cacheRevealBitmaps = () => {
        if (!this.ctx) return;

        const { width, height, color, opacity, trueFillRadius, cacheCanvasSize } = this.cachedStyle;

        const last = this.cachedRevealBitmap;
        if (width === last.width && height == last.height && color == last.color && opacity == last.opacity) {
            return;
        }

        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.cachedRevealBitmap = {
            width, height, color, opacity,
            bitmaps: [],
        };

        for (const i of [0, 1]) {
            // 0 means border, 1 means fill.
            const revealCanvas = document.createElement('canvas');
            revealCanvas.width = cacheCanvasSize;
            revealCanvas.height = cacheCanvasSize;

            const revealCtx = revealCanvas.getContext('2d');
            if (!revealCtx) return;

            const fillAlpha = i === 0 ? opacity : (opacity * 0.5);

            const grd = revealCtx.createRadialGradient(
                cacheCanvasSize / 2,
                cacheCanvasSize / 2,
                0,
                cacheCanvasSize / 2,
                cacheCanvasSize / 2,
                trueFillRadius[i],
            );

            grd.addColorStop(0, 'rgba(' + color + ', ' + fillAlpha + ')');
            grd.addColorStop(1, 'rgba(' + color + ', 0.0)');

            revealCtx.fillStyle = grd;
            revealCtx.fillRect(0, 0, cacheCanvasSize, cacheCanvasSize);

            const bitmap = revealCtx.getImageData(0, 0, cacheCanvasSize, cacheCanvasSize);

            this.cachedRevealBitmap.bitmaps.push(bitmap);
        }
    };

    mouseInCanvas = () => {
        this.cacheCanvasPaintingStyle();
        const { top, left, width, height } = this.cachedStyle;

        const relativeX = this._store.clientX - left;
        const relativeY = this._store.clientY - top;

        if (relativeX < 0 || relativeX > width) return false;
        if (relativeY < 0 || relativeY > height) return false;

        return true;
    };

    getAnimateGrd = (frame: number, grd: CanvasGradient) => {
        if (!this.ctx) {
            return;
        }

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
}
