// The reveal effect as a canvas layer of a surface (<ax-surface layers="reveal">, <ax-reveal>).
// The effect is the shared painter, moved verbatim from the original canvas renderer; this file
// wires it to the surface: shape from the surface outline and border, pointer in local
// coordinates (through the tilt), frames from the surface scheduler.
import { traceContour, traceInner } from '@ax-design/shape';
import type { SurfaceFrame, SurfaceLayer } from '@ax-design/surface';
import { drawReveal, emptyGradients, updateRevealGradients } from './painter.js';
import type { RevealStyle, ShapeKind } from './painter.js';
import { RevealInteraction } from './interaction.js';
import { REVEAL_SCHEMA, styleFrom } from './revealStyle.js';

// -moz-appearance exists in Gecko only.
const gecko = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('-moz-appearance', 'none');

export function createRevealLayer(): SurfaceLayer {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let style: RevealStyle | null = null;
    const gradients = emptyGradients();
    let pxRatio = 1;
    let frame: SurfaceFrame;
    // Gecko: when the freeze after a press ends (see write).
    let resumeAt = 0;

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

            const pointer = f.pointer;
            if (!style && (pointer || interaction.pressed)) {
                style = styleFrom(f);
                updateRevealGradients(ctx, gradients, style, pxRatio);
            }
            const { playing: animationPlaying, cleared } = interaction.update(pointer, f.now, style);
            // Gecko: any touch of the canvas through a press, and for a beat after the
            // release — paint or clear — turns the backdrop of an acrylic layer below clear
            // for those frames. The light and the ripple freeze for that window; the state
            // machine still advances, so the first frame after it shows the current state at
            // once, and a plain hover paints as usual.
            if (gecko) {
                if (interaction.pressed || (pointer && pointer.pressed)) resumeAt = f.now + 400;
                if (f.now < resumeAt) {
                    return animationPlaying || !!(pointer && pointer.pressed) || f.changed.style || f.changed.size;
                }
            }
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
