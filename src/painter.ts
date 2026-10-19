// The reveal effect itself: gradients, hover light, border light and the press ripple.
// Shared by the legacy <ax-reveal> canvas (CanvasConfig) and the Surface layer, so both draw
// exactly the same effect. Only the shape differs, and it comes in through `paintShape`.
//
// The code is moved verbatim from CanvasConfig.paint, CanvasConfig.updateCachedReveal,
// CanvasConfig.updateAnimateGrd and the press timeline in RevealBoundaryStore.paintAll.
import { apply } from '@ax-design/shape';
import type { Point } from '@ax-design/shape';
import type { PaintBox, SurfaceFrame } from '@ax-design/surface';

export interface RevealStyle {
    // "r, g, b" strings.
    color: string;
    opacity: number;
    trueFillRadius: [number, number];
    borderColor: string;
    borderFillRadius: number;
    hoverLight: boolean;
    hoverLightColor: string;
    hoverLightFillRadius: number;
    diffuse: boolean;
    pressAnimation: boolean;
    pressAnimationFillMode: string;
    pressAnimationColor: string;
    pressAnimationSpeed: number;
    releaseAnimationAccelerateRate: number;
}

export interface CachedReveal {
    radius: number;
    radiusFactor: number;
    color: string;
    opacity: number;
    pattern: CanvasGradient | null;
}

export interface RevealGradients {
    borderReveal: CachedReveal;
    fillReveal: CachedReveal;
}

export function emptyGradients(): RevealGradients {
    const empty = (): CachedReveal => ({ radiusFactor: -1, radius: -1, color: 'INVALID', opacity: 0, pattern: null });
    return { borderReveal: empty(), fillReveal: empty() };
}

// From CanvasConfig.updateCachedReveal.
export function updateRevealGradients(ctx: CanvasRenderingContext2D, cache: RevealGradients, c: RevealStyle, pxRatio: number): void {
    const radius = c.trueFillRadius[1] * pxRatio;

    for (let i = 0; i < 2; i++) {
        // 0 means border, 1 means hover light.
        const ls = i === 0 ? cache.borderReveal : cache.fillReveal;
        const color = i === 0 ? c.borderColor : c.hoverLightColor;
        const fillRadiusFactor = i === 0 ? c.borderFillRadius : c.hoverLightFillRadius;
        const trueRadius = radius * fillRadiusFactor;

        const doNotNeedUpdateReveal =
            color === ls.color && c.opacity === ls.opacity && fillRadiusFactor === ls.radiusFactor && trueRadius === ls.radius;

        if (doNotNeedUpdateReveal) continue;

        // The gradient is centered at (trueRadius, trueRadius), painting translates it to the
        // pointer. A gradient is used instead of a pre-rendered bitmap, which takes
        // `(4 * radius) ^ 2` pixels per element and is enough to exhaust the memory of mobile
        // browsers.
        const fillAlpha = i === 0 ? c.opacity : c.opacity * 0.5;
        const grd = ctx.createRadialGradient(trueRadius, trueRadius, 0, trueRadius, trueRadius, trueRadius);

        grd.addColorStop(0, `rgba(${color}, ${fillAlpha})`);
        grd.addColorStop(1, `rgba(${color}, 0.0)`);

        ls.radius = trueRadius;
        ls.radiusFactor = fillRadiusFactor;
        ls.color = color;
        ls.opacity = c.opacity;
        ls.pattern = grd;
    }
}

// From CanvasConfig.updateAnimateGrd.
export function updateAnimateGrd(c: RevealStyle, frame: number, grd: CanvasGradient): void {
    const { pressAnimationColor, opacity } = c;

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
}

export interface PressTimeline {
    mouseDownAnimateStartFrame: number | null;
    mouseDownAnimateCurrentFrame: number | null;
    mouseDownAnimateReleasedFrame: number | null;
    mouseDownAnimateLogicFrame: number | null;
    mouseReleased: boolean;
}

// From RevealBoundaryStore.paintAll. Returns true when the ripple has finished.
export function advancePressAnimation(config: PressTimeline, frame: number, speed: number, accelerateRate: number): boolean {
    // Initialize the animation parameter
    if (config.mouseDownAnimateStartFrame === null) {
        config.mouseDownAnimateStartFrame = frame;
    }

    // Calculate how long the animation has been playing
    const relativeFrame = frame - config.mouseDownAnimateStartFrame;
    config.mouseDownAnimateCurrentFrame = relativeFrame;

    // We assume that Ripple is a one-way linear process from no diffusion to fully diffused,
    // and Logic Frame represents the progress of the animation in this process.
    let unitLogicFrame = relativeFrame;
    if (config.mouseReleased && config.mouseDownAnimateReleasedFrame) {
        unitLogicFrame += (relativeFrame - config.mouseDownAnimateReleasedFrame) * accelerateRate;
    }
    config.mouseDownAnimateLogicFrame = unitLogicFrame / speed;

    return config.mouseDownAnimateLogicFrame > 1;
}

export interface PressState {
    mousePressed: boolean;
    mouseReleased: boolean;
    // Release position relative to the element, css px, used when `hasMouseUp`.
    hasMouseUp: boolean;
    mouseUpX: number;
    mouseUpY: number;
    mouseDownAnimateLogicFrame: number | null;
}

export type ShapeKind = 'fill' | 'ring';

// Where a point of the untilted surface is drawn. Only a projected frame (Firefox during a 3D
// motion, see SurfaceFrame.projected) moves the light with the shape: its containers are flat,
// so the layer draws the shape and the light through `tilt`. Otherwise the container carries the
// tilt and the point is drawn where it is.
export function drawnPoint(frame: SurfaceFrame, x: number, y: number): Point {
    return frame.projected && frame.tilt ? apply(frame.tilt, { x, y }) : { x, y };
}

// The box the light can reach: the element's box, or the paint box that holds the projected shape.
export function drawnArea(frame: SurfaceFrame): PaintBox {
    return frame.projected && frame.tilt ? frame.paint : { left: 0, top: 0, width: frame.width, height: frame.height };
}

export interface RevealPaintInput {
    ctx: CanvasRenderingContext2D;
    pxRatio: number;
    // Element size in css px.
    width: number;
    height: number;
    // Pointer relative to the element, css px.
    relativeX: number;
    relativeY: number;
    // Device px offset of the element's top-left corner inside the canvas. 0 for the legacy
    // canvas, which covers exactly the element.
    originX: number;
    originY: number;
    mouseInBoundary: boolean;
    mouseInRenderArea: boolean;
    style: RevealStyle;
    gradients: RevealGradients;
    press: PressState;
    // Whether a border is drawn at all.
    hasBorder: boolean;
    // Builds the shape path in device px, then fills it with `pattern` translated by (tx, ty).
    paintShape(kind: ShapeKind, pattern: CanvasGradient, tx: number, ty: number): void;
    // Where a point of the untilted surface is drawn (drawnPoint). The light and the ripple are
    // centered there.
    project(x: number, y: number): Point;
}

// From the drawing part of CanvasConfig.paint.
export function drawReveal(p: RevealPaintInput): void {
    const c = p.style;
    const { relativeX, relativeY, pxRatio } = p;

    if (p.mouseInBoundary) {
        const mouseInCanvas = relativeX > 0 && relativeY > 0 && relativeX < p.width && relativeY < p.height;

        const fillPattern = p.gradients.fillReveal.pattern;
        if (c.hoverLight && mouseInCanvas && fillPattern) {
            // draw fill.
            const radius = p.gradients.fillReveal.radius;
            const at = p.project(relativeX, relativeY);
            const putX = Math.floor(at.x * pxRatio - radius) + p.originX;
            const putY = Math.floor(at.y * pxRatio - radius) + p.originY;
            p.paintShape('fill', fillPattern, putX, putY);
        }

        const diffuse = (c.diffuse && p.mouseInRenderArea) || mouseInCanvas;
        const borderPattern = p.gradients.borderReveal.pattern;
        if (p.hasBorder && borderPattern && diffuse) {
            // Draw border.
            const radius = p.gradients.borderReveal.radius;
            const at = p.project(relativeX, relativeY);
            const putX = Math.floor(at.x * pxRatio - radius) + p.originX;
            const putY = Math.floor(at.y * pxRatio - radius) + p.originY;
            p.paintShape('ring', borderPattern, putX, putY);
        }
    }

    const press = p.press;
    if (c.pressAnimation && press.mousePressed && press.mouseDownAnimateLogicFrame) {
        const grdRadius = c.pressAnimationFillMode === 'constrained' ? c.trueFillRadius[1] : Math.max(p.width, p.height);
        const at = press.mouseReleased && press.hasMouseUp ? p.project(press.mouseUpX, press.mouseUpY) : p.project(relativeX, relativeY);
        const cx = at.x * pxRatio + p.originX;
        const cy = at.y * pxRatio + p.originY;
        const animateGrd = p.ctx.createRadialGradient(cx, cy, 0, cx, cy, grdRadius * pxRatio);
        updateAnimateGrd(c, press.mouseDownAnimateLogicFrame, animateGrd);
        p.paintShape('fill', animateGrd, 0, 0);
    }
}
