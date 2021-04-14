import { ComputedStyleStorage, createStorage } from './ComputedStyleStorage.js';
import { RevealBoundaryStore } from './RevealBoundryStore.js';
import { MAGIC_DEFAULT_COLOR } from './variables.js';

type BorderDecoration = 'round' | 'bevel' | 'miter';

const isValidateBorderDecorationType = (x: string): x is BorderDecoration => {
    if (x === 'round') return true;
    if (x === 'bevel') return true;
    if (x === 'miter') return true;
    return false;
};

const extractRGBValue = (x: string) => {
    if (x[0] === '#') {
        // Thanks bro:
        // https://stackoverflow.com/a/11508164/3931936
        const hexVal = parseInt(x.substring(1), 16);

        var r = (hexVal >> 16) & 255;
        var g = (hexVal >> 8) & 255;
        var b = hexVal & 255;

        return r + ',' + g + ',' + b;
    } else {
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
    }
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
    borderColor: string;
    borderDecorationType: BorderDecoration;
    borderDecorationRadius: number;
    topLeftBorderDecorationRadius: number;
    topRightBorderDecorationRadius: number;
    bottomLeftBorderDecorationRadius: number;
    bottomRightBorderDecorationRadius: number;
    borderWidth: number;
    hoverLight: boolean;
    hoverLightColor: string;
    hoverLightFillMode: string;
    hoverLightFillRadius: number;
    diffuse: boolean;
    pressAnimation: boolean;
    pressAnimationFillMode: string;
    pressAnimationColor: string;
    pressAnimationSpeed: number;
    releaseAnimationAccelerateRate: number;
}

interface CachedReveal {
    radius: number;
    borderColor: string;
    hoverLightColor: string;
    opacity: number;
}

/**
 * Cached border and body pattern, for faster painting on the canvas.
 * @interface CachedRevealBitmap
 */
export interface CachedRevealBitmap {
    cachedReveal: CachedReveal;
    cachedCanvas: {
        borderReveal: HTMLCanvasElement;
        fillReveal: HTMLCanvasElement;
    };
    cachedCtx: {
        borderReveal: CanvasRenderingContext2D | null;
        fillReveal: CanvasRenderingContext2D | null;
    };
    cachedPattern: {
        borderReveal: CanvasPattern | null;
        fillReveal: CanvasPattern | null;
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
        borderColor: '',
        borderDecorationType: 'miter',
        borderDecorationRadius: 0,
        topLeftBorderDecorationRadius: 0,
        topRightBorderDecorationRadius: 0,
        bottomLeftBorderDecorationRadius: 0,
        bottomRightBorderDecorationRadius: 0,
        borderWidth: 1,
        hoverLight: true,
        hoverLightColor: '',
        hoverLightFillMode: '',
        hoverLightFillRadius: 0,
        diffuse: true,
        pressAnimation: true,
        pressAnimationFillMode: '',
        pressAnimationColor: '',
        pressAnimationSpeed: 0,
        releaseAnimationAccelerateRate: 0,
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
        };

        const cachedCtx = {
            borderReveal: cachedCanvas.borderReveal.getContext('2d'),
            fillReveal: cachedCanvas.fillReveal.getContext('2d'),
        };

        this.cachedImg = {
            cachedReveal: {
                radius: -1,
                borderColor: 'INVALID',
                hoverLightColor: 'INVALID',
                opacity: 0,
            },
            cachedCanvas,
            cachedCtx,
            cachedPattern: {
                borderReveal: null,
                fillReveal: null,
            },
        };

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
        fillMode = this.computedStyle.get('--reveal-hover-light-radius-mode'),
        fillRadius = this.computedStyle.getNumber('--reveal-hover-light-radius')
    ) => {
        const b = this.cachedBoundingRect;

        switch (fillMode) {
            case 'relative':
                trueFillRadius[0] = Math.min(b.width, b.height) * fillRadius;
                trueFillRadius[1] = Math.max(b.width, b.height) * fillRadius;
                break;
            case 'absolute':
                trueFillRadius[0] = fillRadius;
                trueFillRadius[1] = fillRadius;
                break;
            default:
                throw new SyntaxError('The value of `--reveal-border-style` must be `relative`, `absolute`!');
        }

        this._store.updateMaxRadius(Math.max(trueFillRadius[0], trueFillRadius[1]));

        return trueFillRadius;
    };

    cacheCanvasPaintingStyle = () => {
        if (this.currentFrameId === this.cachedStyleFrameId) {
            return;
        }

        if (this.computedStyle.size() === 0) {
            return;
        }

        const parsedBaseColor = extractRGBValue(this.computedStyle.getColor('--reveal-color')) || '0, 0, 0';
        const parsedBorderColor = extractRGBValue(this.computedStyle.getColor('--reveal-border-color'));
        const parsedHoverLightColor = extractRGBValue(this.computedStyle.getColor('--reveal-hover-light-color'));
        const parsedPressAnimationColor = extractRGBValue(
            this.computedStyle.getColor('--reveal-press-animation-color')
        );

        const c = this.cachedStyle;

        c.color = parsedBaseColor;
        c.opacity = this.computedStyle.getNumber('--reveal-opacity');
        c.borderStyle = this.computedStyle.get('--reveal-border-style');
        c.borderColor = parsedBorderColor !== MAGIC_DEFAULT_COLOR ? parsedBorderColor : parsedBaseColor;
        c.borderDecorationType =
            (this.computedStyle.get('--reveal-border-decoration-type') as BorderDecoration) || 'miter';
        c.borderWidth = this.computedStyle.getNumber('--reveal-border-width');
        c.hoverLight = this.computedStyle.get('--reveal-hover-light') === 'true';
        c.hoverLightColor = parsedHoverLightColor !== MAGIC_DEFAULT_COLOR ? parsedHoverLightColor : parsedBaseColor;
        c.hoverLightFillRadius = this.computedStyle.getNumber('--reveal-hover-light-radius');
        c.hoverLightFillMode = this.computedStyle.get('--reveal-hover-light-radius-mode');
        c.diffuse = this.computedStyle.get('--reveal-diffuse') === 'true';
        c.pressAnimation = this.computedStyle.get('--reveal-press-animation') === 'true';
        c.pressAnimationFillMode = this.computedStyle.get('--reveal-press-animation-radius-mode');
        c.pressAnimationColor =
            parsedPressAnimationColor !== MAGIC_DEFAULT_COLOR ? parsedPressAnimationColor : parsedBaseColor;
        c.pressAnimationSpeed = this.computedStyle.getNumber('--reveal-press-animation-speed');
        c.releaseAnimationAccelerateRate = this.computedStyle.getNumber('--reveal-release-animation-accelerate-rate');

        const r = this.computedStyle.getNumber('--reveal-border-decoration-radius');
        const tl = this.computedStyle.getNumber('--reveal-border-decoration-top-left-radius');
        const tr = this.computedStyle.getNumber('--reveal-border-decoration-top-right-radius');
        const bl = this.computedStyle.getNumber('--reveal-border-decoration-bottom-left-radius');
        const br = this.computedStyle.getNumber('--reveal-border-decoration-bottom-right-radius');

        c.topLeftBorderDecorationRadius = tl >= 0 ? tl : r;
        c.topRightBorderDecorationRadius = tr >= 0 ? tr : r;
        c.bottomLeftBorderDecorationRadius = bl >= 0 ? bl : r;
        c.bottomRightBorderDecorationRadius = br >= 0 ? br : r;

        this.getTrueFillRadius(c.trueFillRadius, c.hoverLightFillMode, c.hoverLightFillRadius);

        if (!isValidateBorderDecorationType(c.borderDecorationType)) {
            throw new SyntaxError(
                'The value of `--reveal-border-decoration-type` must be `round`, `bevel` or `miter`!'
            );
        }

        this.cachedStyleFrameId = this.currentFrameId;
    };

    updateCachedReveal = () => {
        const c = this.cachedStyle;
        const radius = c.trueFillRadius[1] * this.pxRatio;
        const size = radius * 2;

        const last = this.cachedImg.cachedReveal;
        const compareBase = radius === last.radius && c.opacity === last.opacity;
        const doNotNeedUpdateBorderReveal = compareBase && c.borderColor === last.borderColor;
        const doNotNeedUpdateHoverLightReveal = compareBase && c.hoverLightColor === last.hoverLightColor;

        if (doNotNeedUpdateBorderReveal && doNotNeedUpdateHoverLightReveal) return;

        const { borderReveal, fillReveal } = this.cachedImg.cachedCanvas;
        const { borderReveal: borderRevealCtx, fillReveal: fillRevealCtx } = this.cachedImg.cachedCtx;

        this.syncSizeToRevealRadius(borderReveal);
        this.syncSizeToRevealRadius(fillReveal);

        for (let i = 0; i <= 1; i++) {
            // 0 means border, 1 means hover light.
            if (i === 0 && doNotNeedUpdateBorderReveal) continue;
            if (i === 1 && doNotNeedUpdateHoverLightReveal) continue;

            const canvas = i === 0 ? borderReveal : fillReveal;
            const ctx = i === 0 ? borderRevealCtx : fillRevealCtx;
            if (!ctx) continue;

            const color = i === 0 ? c.borderColor : c.hoverLightColor;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const fillAlpha = i === 0 ? c.opacity : c.opacity * 0.5;

            const grd = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);

            grd.addColorStop(0, `rgba(${color}, ${fillAlpha})`);
            grd.addColorStop(1, `rgba(${color}, 0.0)`);

            ctx.fillStyle = grd;
            ctx.clearRect(0, 0, size, size);
            ctx.fillRect(0, 0, size, size);
        }

        this.cachedImg.cachedReveal.radius = radius;
        this.cachedImg.cachedReveal.borderColor = c.borderColor;
        this.cachedImg.cachedReveal.hoverLightColor = c.hoverLightColor;
        this.cachedImg.cachedReveal.opacity = c.opacity;

        if (!this.ctx) return;
        this.cachedImg.cachedPattern.borderReveal = this.ctx.createPattern(borderReveal, 'no-repeat');
        this.cachedImg.cachedPattern.fillReveal = this.ctx.createPattern(fillReveal, 'no-repeat');
    };

    updateCachedBitmap = () => {
        if (!this.ctx) return;
        this.updateCachedReveal();
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

        const radius = trueFillRadius[1] || 1;
        const size = radius * 2 * this.pxRatio;

        if (x.width !== size || x.height !== size) {
            x.width = size;
            x.height = size;
        }
    };

    updateAnimateGrd = (frame: number, grd: CanvasGradient) => {
        const { pressAnimationColor, opacity } = this.cachedStyle;

        const _innerAlpha = opacity * (0.2 - frame);
        const _outerAlpha = opacity * (0.1 - frame * 0.07);
        const _outerBorder = 0.1 + frame * 0.8;

        const innerAlpha = _innerAlpha < 0 ? 0 : _innerAlpha;
        const outerAlpha = _outerAlpha < 0 ? 0 : _outerAlpha;
        const outerBorder = _outerBorder > 1 ? 1 : _outerBorder;

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
                    // inner
                    this.ctx.moveTo(tl2, bw);
                    this.ctx.arcTo(bw, bw, bw, tl2 + bw, tl2);
                    this.ctx.lineTo(bw, h - bw - bl2);
                    this.ctx.arcTo(bw, h - bw, bw + bl2, h - bw, bl2);
                    this.ctx.lineTo(w - bw - br2, h - bw);
                    this.ctx.arcTo(w - bw, h - bw, w - bw, h - bw - br2, br2);
                    this.ctx.lineTo(w - bw, bw + tr2);
                    this.ctx.arcTo(w - bw, bw, w - bw - tr2, bw, tr2);
                    this.ctx.lineTo(tl2, bw);
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
                    this.ctx.moveTo(tl2 + bw, bw);
                    this.ctx.lineTo(bw, tl2 + bw);
                    this.ctx.lineTo(bw, h - bl2 - bw);
                    this.ctx.lineTo(bw + bl2, h - bw);
                    this.ctx.lineTo(w - br2 - bw, h - bw);
                    this.ctx.lineTo(w - bw, h - br2 - bw);
                    this.ctx.lineTo(w - bw, tr2 + bw);
                    this.ctx.lineTo(w - tr2 - bw, bw);
                    this.ctx.lineTo(tl2 + bw, bw);
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
                    if (c.borderStyle === 'full') {
                        // inner
                        this.ctx.moveTo(bw, bw);
                        this.ctx.lineTo(bw, h - bw);
                        this.ctx.lineTo(w - bw, h - bw);
                        this.ctx.lineTo(w - bw, bw);
                        // I don't know by change this to 'bw, bw' caused rendering bug...
                        this.ctx.lineTo(0, bw);
                    }

                    if (c.borderStyle === 'half') {
                        this.ctx.moveTo(0, bw);
                        this.ctx.lineTo(0, h - bw);
                        this.ctx.lineTo(w, h - bw);
                        this.ctx.lineTo(w, bw);
                        this.ctx.lineTo(0, bw);
                    }
                }
                break;
            default:
        }

        this.ctx.closePath();
    };

    paint = (force?: boolean, debug?: boolean): boolean => {
        const store = this._store;

        const animationPlaying = store.animationQueue.includes(this);
        const samePosition = store.clientX === store.paintedClientX && store.clientY === store.paintedClientY;

        if (samePosition && !animationPlaying && !force) {
            return false;
        }

        if (!this.ctx) return false;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.paintedWidth, this.paintedHeight);

        store.dirty = false;

        if (!store.mouseInBoundary && !animationPlaying) {
            return false;
        }

        if (!this.cachedImg.cachedReveal) {
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

        const fillRadius = this.cachedImg.cachedReveal.radius;
        const putX = Math.floor(relativeX * this.pxRatio - fillRadius);
        const putY = Math.floor(relativeY * this.pxRatio - fillRadius);

        if (store.mouseInBoundary) {
            const mouseInCanvas = relativeX > 0 && relativeY > 0 && relativeX < b.width && relativeY < b.height;

            const fillPattern = this.cachedImg.cachedPattern.fillReveal;
            if (c.hoverLight && mouseInCanvas && fillPattern) {
                // draw fill.
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                this.drawShape(false);
                this.ctx.translate(putX, putY);
                this.ctx.fillStyle = fillPattern;
                this.ctx.fill();
            }

            const diffuse = (c.diffuse && mouseInRenderArea) || mouseInCanvas;
            const borderPattern = this.cachedImg.cachedPattern.borderReveal;
            if (c.borderWidth !== 0 && borderPattern && diffuse) {
                // Draw border.
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
