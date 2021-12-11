import { ComputedStyleStorage, createStorage } from './ComputedStyleStorage.js';
import { RevealBoundaryStore } from './RevealBoundryStore.js';

import { extractRGBValue } from './utils/extractRGBValue.js'
import { isValidateBorderDecorationType } from './utils/isValidateBorderDecorationType.js';
import type { BorderDecoration, CachedBoundingRect, CachedStyle } from './utils/types.js';

export class BaseConfig<T extends Element> {
    protected _store: RevealBoundaryStore;

    pxRatio = window.devicePixelRatio || 1;

    readonly container: HTMLElement;
    readonly element: T;

    protected readonly computedStyle: ComputedStyleStorage;

    paintedWidth = 0;
    paintedHeight = 0;

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
        borderFillRadius: 0,
        borderDecorationType: 'miter',
        borderDecorationRadius: 0,
        topLeftBorderDecorationRadius: 0,
        topRightBorderDecorationRadius: 0,
        bottomLeftBorderDecorationRadius: 0,
        bottomRightBorderDecorationRadius: 0,
        withLeftBorderFactor: 1,
        withRightBorderFactor: 1,
        withTopBorderFactor: 1,
        withBottomBorderFactor: 1,
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

    dirty: boolean = false;
    /**
     * If is cleaned up by `RevealBoundaryStore` during animation duration
     * checkup.
     */
    cleanedUp: boolean = false;

    mouseUpClientX: number | null = null;
    mouseUpClientY: number | null = null;
    mouseDownAnimateStartFrame: number | null = null;
    mouseDownAnimateCurrentFrame: number | null = null;
    mouseDownAnimateReleasedFrame: number | null = null;
    mouseDownAnimateLogicFrame: number | null = null;
    mousePressed = false;

    mouseReleased = false;

    constructor(store: RevealBoundaryStore, $canvas: T, $container: HTMLElement) {
        this._store = store;

        this.container = $container;
        this.element = $canvas;

        this.computedStyle = createStorage($container);
    }

    cacheBoundingRect = () => {
        if (this.currentFrameId === this.cachedBoundingRectFrameId) {
            return;
        }

        const boundingRect = this.container.getBoundingClientRect();

        this.cachedBoundingRect.top = Math.floor(boundingRect.top);
        this.cachedBoundingRect.left = Math.floor(boundingRect.left);
        this.cachedBoundingRect.width = Math.floor(boundingRect.width);
        this.cachedBoundingRect.height = Math.floor(boundingRect.height);

        this.cachedBoundingRectFrameId = this.currentFrameId;
    };

    getTrueFillRadius = (
        trueFillRadius = [0, 0] as [number, number],
        fillMode = this.computedStyle.get('--reveal-hover-light-fill-radius-mode') || 'relative'
    ) => {
        const b = this.cachedBoundingRect;

        switch (fillMode) {
            case 'relative':
                trueFillRadius[0] = Math.min(b.width, b.height);
                trueFillRadius[1] = Math.max(b.width, b.height);
                break;
            case 'absolute':
                trueFillRadius[0] = -1;
                trueFillRadius[1] = -1;
                break;
            default:
                throw new SyntaxError(
                    'The value of `--reveal-border-style` must be `relative`, `absolute`, but got `' + fillMode + '`!'
                );
        }

        this._store.updateMaxRadius(Math.max(trueFillRadius[0], trueFillRadius[1]));

        return trueFillRadius;
    };

    getPropFromMultipleSource = (domPropsName: string, cssPropsName: string) => {
        const domProps = this.container.dataset[domPropsName];
        if (domProps) return domProps;

        return this.computedStyle.get(cssPropsName);
    };

    getNumberPropFromMultipleSource = (domPropsName: string, cssPropsName: string) => {
        const domProps = this.container.dataset[domPropsName];
        if (domProps) return Number.parseFloat(domProps);

        return this.computedStyle.getNumber(cssPropsName);
    };

    cacheCanvasPaintingStyle = () => {
        if (this.currentFrameId === this.cachedStyleFrameId) {
            return;
        }

        if (this.computedStyle.size() === 0) {
            return;
        }

        const parsedBaseColor = extractRGBValue(this.computedStyle.getColor('--reveal-color')) || '0, 0, 0';
        const parsedBorderColor =
            extractRGBValue(this.computedStyle.getColor('--reveal-border-color')) || parsedBaseColor;
        const parsedHoverLightColor =
            extractRGBValue(this.computedStyle.getColor('--reveal-hover-light-color')) || parsedBaseColor;
        const parsedPressAnimationColor =
            extractRGBValue(this.computedStyle.getColor('--reveal-press-animation-color')) || parsedBaseColor;

        const c = this.cachedStyle;

        c.color = parsedBaseColor;
        c.opacity = this.computedStyle.getNumber('--reveal-opacity');

        // Border related configurations
        c.borderStyle = this.computedStyle.get('--reveal-border-style');
        c.borderColor = parsedBorderColor;

        c.borderFillRadius = this.computedStyle.getNumber('--reveal-border-fill-radius');
        c.borderDecorationType =
            (this.computedStyle.get('--reveal-border-decoration-type') as BorderDecoration) || 'miter';
        c.borderWidth = this.computedStyle.getNumber('--reveal-border-width');

        c.withLeftBorderFactor =
            this.getPropFromMultipleSource('leftBorder', '--reveal-border-left') === 'line' ? 1 : 0;
        c.withRightBorderFactor =
            this.getPropFromMultipleSource('rightBorder', '--reveal-border-right') === 'line' ? 1 : 0;
        c.withTopBorderFactor = this.getPropFromMultipleSource('topBorder', '--reveal-border-top') === 'line' ? 1 : 0;
        c.withBottomBorderFactor =
            this.getPropFromMultipleSource('bottomBorder', '--reveal-border-bottom') === 'line' ? 1 : 0;

        // Hover light related configurations
        c.hoverLight = this.computedStyle.get('--reveal-hover-light') === 'true';
        c.hoverLightColor = parsedHoverLightColor;
        c.hoverLightFillRadius = this.computedStyle.getNumber('--reveal-hover-light-fill-radius');
        c.hoverLightFillMode = this.computedStyle.get('--reveal-hover-light-fill-radius-mode') || 'relative';

        // Press animation related configurations
        c.diffuse = this.computedStyle.get('--reveal-diffuse') === 'true';
        c.pressAnimation = this.computedStyle.get('--reveal-press-animation') === 'true';
        c.pressAnimationFillMode = this.computedStyle.get('--reveal-press-animation-radius-mode');
        c.pressAnimationColor = parsedPressAnimationColor;
        c.pressAnimationSpeed = this.computedStyle.getNumber('--reveal-press-animation-speed');
        c.releaseAnimationAccelerateRate = this.computedStyle.getNumber('--reveal-release-animation-accelerate-rate');

        // Border decoration related configurations
        const r = this.computedStyle.getNumber('--reveal-border-decoration-radius');
        const tl = this.getNumberPropFromMultipleSource(
            'topLeftBorderRadius',
            '--reveal-border-decoration-top-left-radius'
        );
        const tr = this.getNumberPropFromMultipleSource(
            'topRightBorderRadius',
            '--reveal-border-decoration-top-right-radius'
        );
        const bl = this.getNumberPropFromMultipleSource(
            'bottomLeftBorderRadius',
            '--reveal-border-decoration-bottom-left-radius'
        );
        const br = this.getNumberPropFromMultipleSource(
            'bottomRightBorderRadius',
            '--reveal-border-decoration-bottom-right-radius'
        );

        c.topLeftBorderDecorationRadius = tl >= 0 ? tl : r;
        c.topRightBorderDecorationRadius = tr >= 0 ? tr : r;
        c.bottomLeftBorderDecorationRadius = bl >= 0 ? bl : r;
        c.bottomRightBorderDecorationRadius = br >= 0 ? br : r;

        this.getTrueFillRadius(c.trueFillRadius, c.hoverLightFillMode);

        if (!isValidateBorderDecorationType(c.borderDecorationType)) {
            throw new SyntaxError(
                'The value of `--reveal-border-decoration-type` must be `round`, `bevel` or `miter`!'
            );
        }

        this.cachedStyleFrameId = this.currentFrameId;
    };

    mouseInCanvas = () => {
        const b = this.cachedBoundingRect;

        const relativeX = this._store.clientX - b.left;
        const relativeY = this._store.clientY - b.top;

        return relativeX > 0 && relativeY > 0 && relativeX < b.width && relativeY < b.height;
    };

    syncSizeToRevealRadius = (x: HTMLCanvasElement, factor: number) => {
        const { trueFillRadius } = this.cachedStyle;

        const radius = trueFillRadius[1] || 1;
        const size = radius * 2 * this.pxRatio * factor;

        if (x.width !== size || x.height !== size) {
            x.width = size;
            x.height = size;
        }
    };
}