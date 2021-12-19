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

    shapeDirty: boolean = true;
    fillDirty: boolean = true;
    animationDirty: boolean = true;

    /**
     * If is cleaned up by `RevealBoundaryStore` during animation
     * duration checkup.
     */
    cleanedUpForAnimation: boolean = false;

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
                    'The value of `--reveal-hover-light-fill-radius-mode` must be `relative`, `absolute`, but got `' + fillMode + '`!'
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


        const nextColor = parsedBaseColor;
        const nextOpacity = this.computedStyle.getNumber('--reveal-opacity');

        // Border related configurations
        const nextBorderColor = parsedBorderColor;

        const nextBorderFillRadius = this.computedStyle.getNumber('--reveal-border-fill-radius');
        const nextBorderDecorationType =
            (this.computedStyle.get('--reveal-border-decoration-type') as BorderDecoration) || 'miter';
        const nextBorderWidth = this.computedStyle.getNumber('--reveal-border-width');

        const nextWithLeftBorderFactor =
            this.getPropFromMultipleSource('leftBorder', '--reveal-border-left-type') === 'line' ? 1 : 0;
        const nextWithRightBorderFactor =
            this.getPropFromMultipleSource('rightBorder', '--reveal-border-right-type') === 'line' ? 1 : 0;
        const nextWithTopBorderFactor = this.getPropFromMultipleSource('topBorder', '--reveal-border-top-type') === 'line' ? 1 : 0;
        const nextWithBottomBorderFactor =
            this.getPropFromMultipleSource('bottomBorder', '--reveal-border-bottom-type') === 'line' ? 1 : 0;

        // Hover light related configurations
        const nextHoverLight = this.computedStyle.get('--reveal-hover-light') === 'true';
        const nextHoverLightColor = parsedHoverLightColor;
        const nextHoverLightFillRadius = this.computedStyle.getNumber('--reveal-hover-light-fill-radius');
        const nextHoverLightFillMode = this.computedStyle.get('--reveal-hover-light-fill-radius-mode') || 'relative';

        // Press animation related configurations
        const nextDiffuse = this.computedStyle.get('--reveal-diffuse') === 'true';
        const nextPressAnimation = this.computedStyle.get('--reveal-press-animation') === 'true';
        const nextPressAnimationFillMode = this.computedStyle.get('--reveal-press-animation-radius-mode');
        const nextPressAnimationColor = parsedPressAnimationColor;
        const nextPressAnimationSpeed = this.computedStyle.getNumber('--reveal-press-animation-speed');
        const nextReleaseAnimationAccelerateRate = this.computedStyle.getNumber('--reveal-release-animation-accelerate-rate');

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

        const nextTopLeftBorderDecorationRadius = tl >= 0 ? tl : r;
        const nextTopRightBorderDecorationRadius = tr >= 0 ? tr : r;
        const nextBottomLeftBorderDecorationRadius = bl >= 0 ? bl : r;
        const nextBottomRightBorderDecorationRadius = br >= 0 ? br : r;

        const c = this.cachedStyle;

        this.fillDirty = this.fillDirty || c.color !== nextColor;
        this.fillDirty = this.fillDirty || c.opacity !== nextOpacity;
        this.fillDirty = this.fillDirty || c.borderColor !== nextBorderColor;
        this.fillDirty = this.fillDirty || c.borderFillRadius !== nextBorderFillRadius;
        this.fillDirty = this.fillDirty || c.hoverLightColor !== nextHoverLightColor;
        this.fillDirty = this.fillDirty || c.hoverLightFillRadius !== nextHoverLightFillRadius;
        this.fillDirty = this.fillDirty || c.hoverLightFillMode !== nextHoverLightFillMode;

        this.shapeDirty = this.shapeDirty || c.borderDecorationType !== nextBorderDecorationType;
        this.shapeDirty = this.shapeDirty || c.borderWidth !== nextBorderWidth;
        this.shapeDirty = this.shapeDirty || c.withLeftBorderFactor !== nextWithLeftBorderFactor;
        this.shapeDirty = this.shapeDirty || c.withRightBorderFactor !== nextWithRightBorderFactor;
        this.shapeDirty = this.shapeDirty || c.withTopBorderFactor !== nextWithTopBorderFactor;
        this.shapeDirty = this.shapeDirty || c.withBottomBorderFactor !== nextWithBottomBorderFactor;
        this.shapeDirty = this.shapeDirty || c.topLeftBorderDecorationRadius !== nextTopLeftBorderDecorationRadius;
        this.shapeDirty = this.shapeDirty || c.topRightBorderDecorationRadius !== nextTopRightBorderDecorationRadius;
        this.shapeDirty = this.shapeDirty || c.bottomLeftBorderDecorationRadius !== nextBottomLeftBorderDecorationRadius;
        this.shapeDirty = this.shapeDirty || c.bottomRightBorderDecorationRadius !== nextBottomRightBorderDecorationRadius;

        this.animationDirty = this.animationDirty || c.pressAnimation !== nextPressAnimation;
        this.animationDirty = this.animationDirty || c.pressAnimationFillMode !== nextPressAnimationFillMode;
        this.animationDirty = this.animationDirty || c.pressAnimationColor !== nextPressAnimationColor;
        this.animationDirty = this.animationDirty || c.pressAnimationSpeed !== nextPressAnimationSpeed;
        this.animationDirty = this.animationDirty || c.releaseAnimationAccelerateRate !== nextReleaseAnimationAccelerateRate;

        c.color = nextColor;
        c.opacity = nextOpacity;

        c.borderColor = nextBorderColor;

        c.borderFillRadius = nextBorderFillRadius;
        c.borderDecorationType = nextBorderDecorationType;
        c.borderWidth = nextBorderWidth;

        c.withLeftBorderFactor = nextWithBottomBorderFactor;
        c.withRightBorderFactor = nextWithRightBorderFactor;
        c.withTopBorderFactor = nextWithTopBorderFactor;
        c.withBottomBorderFactor = nextWithBottomBorderFactor;

        c.hoverLight = nextHoverLight;
        c.hoverLightColor = nextHoverLightColor;
        c.hoverLightFillRadius = nextHoverLightFillRadius;
        c.hoverLightFillMode = nextHoverLightFillMode;

        c.diffuse = nextDiffuse;
        c.pressAnimation = nextPressAnimation;
        c.pressAnimationFillMode = nextPressAnimationFillMode;
        c.pressAnimationColor = nextPressAnimationColor;
        c.pressAnimationSpeed = nextPressAnimationSpeed;
        c.releaseAnimationAccelerateRate = nextReleaseAnimationAccelerateRate;

        c.topLeftBorderDecorationRadius = nextTopLeftBorderDecorationRadius;
        c.topRightBorderDecorationRadius = nextTopRightBorderDecorationRadius;
        c.bottomLeftBorderDecorationRadius = nextBottomLeftBorderDecorationRadius;
        c.bottomRightBorderDecorationRadius = nextBottomRightBorderDecorationRadius;

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