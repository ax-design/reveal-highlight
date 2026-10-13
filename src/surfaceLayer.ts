// The reveal effect as an <ax-surface> layer. The effect itself is the shared painter (the same
// code the legacy <ax-reveal> canvas runs); this file only wires it to the surface: shape from
// the surface outline and border, pointer in local coordinates (through the tilt), frames from
// the surface scheduler.
import { traceContour, traceInner } from '@ax-design/shape';
import type { PropertySpec, Rgba } from '@ax-design/typed-om';
import type { SurfaceFrame, SurfaceLayer } from '@ax-design/surface';
import { MAGIC_DEFAULT_COLOR } from './variables.js';
import { advancePressAnimation, drawReveal, emptyGradients, updateRevealGradients } from './painter.js';
import type { PressTimeline, RevealStyle, ShapeKind } from './painter.js';

// The legacy properties, with their legacy initial values. Not registered here: the legacy
// register() owns their registration and definitions must never differ.
const bool = (name: string, initial: string): PropertySpec => ({ name, syntax: { type: 'keyword', values: ['true', 'false'] }, initial, inherits: true });
const color = (name: string, initial: string): PropertySpec => ({
    name,
    syntax: { type: 'color', keywords: [MAGIC_DEFAULT_COLOR] },
    initial,
    inherits: true,
});
const number = (name: string, initial: string): PropertySpec => ({ name, syntax: { type: 'number' }, initial, inherits: true });

export const REVEAL_SCHEMA: PropertySpec[] = [
    color('--reveal-color', 'rgb(0, 0, 0)'),
    number('--reveal-opacity', '0.26'),
    color('--reveal-border-color', MAGIC_DEFAULT_COLOR),
    number('--reveal-border-fill-radius', '1.5'),
    bool('--reveal-hover-light', 'true'),
    color('--reveal-hover-light-color', MAGIC_DEFAULT_COLOR),
    number('--reveal-hover-light-fill-radius', '1.5'),
    { name: '--reveal-hover-light-fill-radius-mode', syntax: { type: 'keyword', values: ['relative', 'absolute'] }, initial: 'relative', inherits: true },
    bool('--reveal-diffuse', 'true'),
    bool('--reveal-press-animation', 'true'),
    color('--reveal-press-animation-color', MAGIC_DEFAULT_COLOR),
    { name: '--reveal-press-animation-radius-mode', syntax: { type: 'keyword', values: ['cover', 'constrained'] }, initial: 'cover', inherits: true },
    number('--reveal-press-animation-speed', '2000'),
    number('--reveal-release-animation-accelerate-rate', '6'),
];

// "r, g, b" like the legacy extractRGBValue; `magic` falls back to the base color.
function rgb(value: Rgba | string, fallback: string): string {
    if (typeof value === 'string' || !Array.isArray(value)) return fallback;
    return `${value[0]}, ${value[1]}, ${value[2]}`;
}

function styleFrom(frame: SurfaceFrame): RevealStyle {
    const v = frame.values;
    const raw = (name: string) => v.raw(name) as Rgba | string;
    const base = rgb(raw('--reveal-color'), '0, 0, 0');
    const relative = v.keyword('--reveal-hover-light-fill-radius-mode') !== 'absolute';
    return {
        color: base,
        opacity: v.number('--reveal-opacity'),
        // From BaseConfig.getTrueFillRadius.
        trueFillRadius: relative ? [Math.min(frame.width, frame.height), Math.max(frame.width, frame.height)] : [-1, -1],
        borderColor: rgb(raw('--reveal-border-color'), base),
        borderFillRadius: v.number('--reveal-border-fill-radius'),
        hoverLight: v.keyword('--reveal-hover-light') === 'true',
        hoverLightColor: rgb(raw('--reveal-hover-light-color'), base),
        hoverLightFillRadius: v.number('--reveal-hover-light-fill-radius'),
        diffuse: v.keyword('--reveal-diffuse') === 'true',
        pressAnimation: v.keyword('--reveal-press-animation') === 'true',
        pressAnimationFillMode: v.keyword('--reveal-press-animation-radius-mode'),
        pressAnimationColor: rgb(raw('--reveal-press-animation-color'), base),
        pressAnimationSpeed: v.number('--reveal-press-animation-speed'),
        releaseAnimationAccelerateRate: v.number('--reveal-release-animation-accelerate-rate'),
    };
}

export function createRevealLayer(): SurfaceLayer {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let style: RevealStyle | null = null;
    const gradients = emptyGradients();
    let pxRatio = 1;
    let frame: SurfaceFrame;

    // Press state, as on the legacy config.
    const timeline: PressTimeline & { pressed: boolean; upX: number; upY: number; hasUp: boolean } = {
        mouseDownAnimateStartFrame: null,
        mouseDownAnimateCurrentFrame: null,
        mouseDownAnimateReleasedFrame: null,
        mouseDownAnimateLogicFrame: null,
        mouseReleased: false,
        pressed: false,
        upX: 0,
        upY: 0,
        hasUp: false,
    };
    let wasPressed = false;
    let dirty = false;
    // Inputs of the last painted frame; identical inputs skip painting (legacy behavior).
    let painted = { x: NaN, y: NaN, w: -1, h: -1, style: null as RevealStyle | null, shape: null as unknown, animation: false };

    const resetPress = () => {
        timeline.mouseDownAnimateStartFrame = null;
        timeline.mouseDownAnimateCurrentFrame = null;
        timeline.mouseDownAnimateReleasedFrame = null;
        timeline.mouseDownAnimateLogicFrame = null;
        timeline.mouseReleased = false;
        timeline.pressed = false;
        timeline.hasUp = false;
    };

    const clear = () => {
        if (!ctx || !dirty) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dirty = false;
        painted.x = NaN;
    };

    // Builds the shape in device px and fills it with `pattern` translated by (tx, ty).
    const paintShape = (kind: ShapeKind, pattern: CanvasGradient, tx: number, ty: number) => {
        if (!ctx) return;
        const { paint, shape } = frame;
        const toDevice = () => ctx!.setTransform(pxRatio, 0, 0, pxRatio, -paint.left * pxRatio, -paint.top * pxRatio);
        toDevice();
        ctx.beginPath();
        traceContour(ctx, shape.outline);
        if (kind === 'fill') {
            ctx.setTransform(1, 0, 0, 1, tx, ty);
            ctx.fillStyle = pattern;
            ctx.fill();
            return;
        }
        // The ring as outline plus inner edge, filled even-odd, like the legacy canvas did.
        traceInner(ctx, frame.ringInner());
        ctx.setTransform(1, 0, 0, 1, tx, ty);
        ctx.fillStyle = pattern;
        ctx.fill('evenodd');
    };

    return {
        schema: REVEAL_SCHEMA,
        tracksPointer: true,
        // The render area test of CanvasConfig.paint: nothing is drawn farther than the larger
        // side from the element.
        reach(width: number, height: number) {
            return Math.max(width, height);
        },
        attach(container) {
            canvas = document.createElement('canvas');
            canvas.setAttribute('aria-hidden', 'true');
            canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
            container.appendChild(canvas);
            ctx = canvas.getContext('2d');
        },
        detach() {
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
            ctx = null;
        },
        write(f: SurfaceFrame) {
            frame = f;
            if (!ctx) return false;

            // Size and style.
            const ratio = window.devicePixelRatio || 1;
            const width = Math.floor(f.paint.width * ratio);
            const height = Math.floor(f.paint.height * ratio);
            if (canvas.width !== width || canvas.height !== height || ratio !== pxRatio) {
                pxRatio = ratio;
                canvas.width = width;
                canvas.height = height;
                dirty = false;
                painted.x = NaN;
            }
            // Style and gradients are built lazily: most surfaces never get the pointer close.
            if (f.changed.style || f.changed.size) style = null;

            // Press edges, with the legacy semantics: a mouse release accelerates the ripple
            // (switchAnimation), a touch release or a cancel clears it (clearAll).
            const pointer = f.pointer;
            const pressed = !!pointer && pointer.pressed;
            if (pressed && !wasPressed && pointer!.inside) {
                resetPress();
                timeline.pressed = true;
            } else if (!pressed && wasPressed && timeline.pressed) {
                if (pointer && pointer.pointerType === 'mouse') {
                    timeline.mouseReleased = true;
                    timeline.mouseDownAnimateReleasedFrame = timeline.mouseDownAnimateCurrentFrame;
                    timeline.upX = pointer.x;
                    timeline.upY = pointer.y;
                    timeline.hasUp = true;
                } else {
                    resetPress();
                    clear();
                }
            }
            wasPressed = pressed;

            if (!pointer && !timeline.pressed) {
                clear();
                return false;
            }
            if (!style) {
                style = styleFrom(f);
                updateRevealGradients(ctx, gradients, style, pxRatio);
            }

            let animationPlaying = timeline.pressed && style.pressAnimation;
            if (animationPlaying && advancePressAnimation(timeline, f.now, style.pressAnimationSpeed, style.releaseAnimationAccelerateRate)) {
                // From cleanUpAnimationUnit: the ripple finished.
                resetPress();
                animationPlaying = false;
            }

            if (!pointer && !animationPlaying) {
                clear();
                return false;
            }

            // From CanvasConfig.paint: render area test and the unchanged-frame skip.
            const relativeX = pointer ? pointer.x : NaN;
            const relativeY = pointer ? pointer.y : NaN;
            const maxRadius = style.trueFillRadius[1];
            const mouseInRenderArea =
                relativeX + maxRadius > 0 && relativeX - maxRadius < f.width && relativeY + maxRadius > 0 && relativeY - maxRadius < f.height;
            if (!mouseInRenderArea && !animationPlaying) {
                clear();
                return false;
            }
            const unchanged =
                dirty &&
                !animationPlaying &&
                !painted.animation &&
                relativeX === painted.x &&
                relativeY === painted.y &&
                f.width === painted.w &&
                f.height === painted.h &&
                style === painted.style &&
                f.shape === painted.shape &&
                !f.changed.tilt;
            if (unchanged) return false;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            dirty = true;
            painted = { x: relativeX, y: relativeY, w: f.width, h: f.height, style, shape: f.shape, animation: animationPlaying };

            drawReveal({
                ctx,
                pxRatio,
                width: f.width,
                height: f.height,
                relativeX,
                relativeY,
                originX: -f.paint.left * pxRatio,
                originY: -f.paint.top * pxRatio,
                mouseInBoundary: !!pointer,
                mouseInRenderArea,
                style,
                gradients,
                press: {
                    mousePressed: timeline.pressed,
                    mouseReleased: timeline.mouseReleased,
                    hasMouseUp: timeline.hasUp,
                    mouseUpX: timeline.upX,
                    mouseUpY: timeline.upY,
                    mouseDownAnimateLogicFrame: timeline.mouseDownAnimateLogicFrame,
                },
                hasBorder: f.borderWidths.some((w) => w > 0),
                paintShape,
            });
            return animationPlaying;
        },
    };
}
