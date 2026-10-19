// The reveal effect as a canvas layer of a surface (<ax-surface layers="reveal">, <ax-reveal>).
// The effect is the shared painter, moved verbatim from the original canvas renderer; this file
// wires it to the surface: shape from the surface outline and border, pointer in local
// coordinates (through the tilt), frames from the surface scheduler.
import { traceContour, traceInner } from '@ax-design/shape';
import { appearance, useFallback } from '@ax-design/surface';
import type { SurfaceFrame, SurfaceLayer } from '@ax-design/surface';
import { drawReveal, emptyGradients, updateRevealGradients } from './painter.js';
import type { RevealStyle, ShapeKind } from './painter.js';
import { RevealInteraction } from './interaction.js';
import { REVEAL_SCHEMA, styleFrom } from './revealStyle.js';

export function createRevealLayer(): SurfaceLayer {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let style: RevealStyle | null = null;
    const gradients = emptyGradients();
    let pxRatio = 1;
    let frame: SurfaceFrame;

    const interaction = new RevealInteraction();
    let dirty = false;
    // Inputs of the last painted frame; identical inputs skip painting (legacy behavior).
    let painted = { x: NaN, y: NaN, w: -1, h: -1, style: null as RevealStyle | null, shape: null as unknown, animation: false };

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
        // The fallback is read live: the ripple stops as soon as it is set, before the next frame.
        pressRemaining(now: number) {
            return interaction.pressRemaining(now, useFallback(appearance()) ? null : style);
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

            // Like WinUI's RevealBrush, the fallback is a solid color with no light: nothing is
            // drawn in forced colors, with reduced transparency or with setAlwaysUseFallback. The
            // press is dropped, so no ripple resumes when the fallback ends. Leaving it leaves
            // dirty false, so the next frame draws.
            if (f.appearance && useFallback(f.appearance)) {
                clear();
                interaction.reset();
                return false;
            }

            const pointer = f.pointer;
            if (!style && (pointer || interaction.pressed)) {
                style = styleFrom(f);
                updateRevealGradients(ctx, gradients, style, pxRatio);
            }
            const { playing: animationPlaying, cleared } = interaction.update(pointer, f.now, style);
            if (cleared) clear();
            if (!style) {
                clear();
                return false;
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
                press: interaction.press,
                hasBorder: f.borderWidths.some((w) => w > 0),
                paintShape,
            });
            return animationPlaying;
        },
    };
}
