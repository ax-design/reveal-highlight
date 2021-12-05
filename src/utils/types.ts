export type BorderDecoration = 'round' | 'bevel' | 'miter';

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
    borderFillRadius: number;
    borderDecorationType: BorderDecoration;
    borderDecorationRadius: number;
    topLeftBorderDecorationRadius: number;
    topRightBorderDecorationRadius: number;
    bottomLeftBorderDecorationRadius: number;
    bottomRightBorderDecorationRadius: number;
    /**
     * @param withLeftBorderFactor
     * If the left border is shown, this value is 1, or the value is 0.
     */
    withLeftBorderFactor: number;
    /**
     * @param withRightBorderFactor
     * If the right border is shown, this value is 1, or the value is 0.
     */
    withRightBorderFactor: number;
    /**
     * @param withTopBorderFactor
     * If the top border is shown, this value is 1, or the value is 0.
     */
    withTopBorderFactor: number;
    /**
     * @param withBottomBorderFactor
     * If the bottom border is shown, this value is 1, or the value is 0.
     */
    withBottomBorderFactor: number;
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
    radiusFactor: number;
    color: string;
    opacity: number;
    pattern: CanvasPattern | null;
}

/**
 * Cached border and body pattern, for faster painting on the canvas.
 * @interface CachedRevealBitmap
 */
export interface CachedRevealBitmap {
    cachedReveal: {
        borderReveal: CachedReveal;
        fillReveal: CachedReveal;
    };
    cachedCanvas: {
        borderReveal: HTMLCanvasElement;
        fillReveal: HTMLCanvasElement;
    };
    cachedCtx: {
        borderReveal: CanvasRenderingContext2D | null;
        fillReveal: CanvasRenderingContext2D | null;
    };
}

/**
 * Cached border and body pattern, just to store something in similar way.
 * @interface CachedRevealPath
 */
export interface CachedRevealPath {
    cachedReveal: {
        borderReveal: CachedReveal;
        fillReveal: CachedReveal;
    };
    cachedPath: {
        borderReveal: SVGPathElement;
        fillReveal: SVGPathElement;
        rippleReveal: SVGPathElement;
    };
    cachedGradient: {
        borderReveal: SVGRadialGradientElement;
        fillReveal: SVGRadialGradientElement;
        rippleReveal: SVGRadialGradientElement;
    };
    cachedGradientStop: {
        borderReveal: Readonly<[SVGStopElement, SVGStopElement]>;
        fillReveal: Readonly<[SVGStopElement, SVGStopElement]>;
        rippleReveal: Readonly<[SVGStopElement, SVGStopElement, SVGStopElement]>;
    };
}