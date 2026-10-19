// The reveal effect as an SVG layer (<ax-reveal-ng>, <ax-surface layers="reveal-svg">), ported
// from the original SVG renderer: three radial gradients (border light, hover fill, ripple) on
// paths of the surface shape. Fixes one bug of the original: gradient stop colors were set to
// bare "r, g, b" strings, which are not colors, so every stop rendered black.
import { apply, innerToSvgPath, projectContour, toSvgPath } from '@ax-design/shape';
import { appearance, useFallback } from '@ax-design/surface';
import type { SurfaceFrame, SurfaceLayer } from '@ax-design/surface';
import { RevealInteraction } from './interaction.js';
import { drawnArea, drawnPoint } from './painter.js';
import type { RevealStyle } from './painter.js';
import { REVEAL_SCHEMA, styleFrom } from './revealStyle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
let instance = 0;

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
    const e = document.createElementNS(SVG_NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
}

interface Gradient {
    grad: SVGRadialGradientElement;
    stops: SVGStopElement[];
}

export function createRevealSvgLayer(): SurfaceLayer {
    const id = `ax-reveal-${instance++}`;
    let svg: SVGSVGElement | null = null;
    let border: SVGPathElement;
    let fill: SVGPathElement;
    let ripple: SVGPathElement;
    let borderGrad: Gradient;
    let fillGrad: Gradient;
    let rippleGrad: Gradient;
    let style: RevealStyle | null = null;
    const interaction = new RevealInteraction();
    let dirty = false;
    let painted = { x: NaN, y: NaN };

    const gradient = (name: string, stops: number): Gradient => {
        const grad = el('radialGradient', { id: `${id}-${name}`, gradientUnits: 'userSpaceOnUse', r: '10' });
        const list: SVGStopElement[] = [];
        for (let i = 0; i < stops; i++) {
            const stop = el('stop', { offset: i === stops - 1 ? '1' : '0' });
            grad.appendChild(stop);
            list.push(stop);
        }
        return { grad, stops: list };
    };

    const setFill = (path: SVGPathElement, value: string) => {
        if (path.style.fill !== value) path.style.fill = value;
    };

    const clear = () => {
        if (!dirty) return;
        setFill(border, 'transparent');
        setFill(fill, 'transparent');
        setFill(ripple, 'transparent');
        dirty = false;
        painted = { x: NaN, y: NaN };
    };

    // From SvgConfig.updateCachedReveal, with real colors.
    const applyStyle = (c: RevealStyle) => {
        const b = borderGrad.stops;
        b[0].style.stopColor = b[1].style.stopColor = `rgb(${c.borderColor})`;
        b[0].style.stopOpacity = String(c.opacity);
        b[1].style.stopOpacity = '0';
        const f = fillGrad.stops;
        f[0].style.stopColor = f[1].style.stopColor = `rgb(${c.hoverLightColor})`;
        f[0].style.stopOpacity = String(c.opacity * 0.5);
        f[1].style.stopOpacity = '0';
        for (const stop of rippleGrad.stops) stop.style.stopColor = `rgb(${c.pressAnimationColor})`;
        const absolute = c.trueFillRadius[0] === -1;
        borderGrad.grad.r.baseVal.value = absolute ? c.borderFillRadius : c.borderFillRadius * c.trueFillRadius[1];
        fillGrad.grad.r.baseVal.value = absolute ? c.hoverLightFillRadius : c.hoverLightFillRadius * c.trueFillRadius[0];
    };

    // From SvgConfig.updateAnimateGrd.
    const updateRipple = (c: RevealStyle, frame: number, x: number, y: number, radius: number) => {
        const { opacity } = c;
        const _innerAlpha = opacity * (0.2 - frame);
        const _outerAlpha = opacity * (0.1 - frame * 0.07);
        const _outerBorder = 0.1 + frame * 0.8;
        const innerAlpha = _innerAlpha < 0 ? 0 : _innerAlpha;
        const outerAlpha = _outerAlpha < 0 ? 0 : _outerAlpha;
        const outerBorder = _outerBorder < 0 ? 0 : _outerBorder;
        const s = rippleGrad.stops;
        s[0].style.stopOpacity = String(innerAlpha);
        s[1].style.stopOpacity = String(outerAlpha);
        s[2].style.stopOpacity = '0';
        s[0].offset.baseVal = 0;
        s[1].offset.baseVal = outerBorder * 0.55;
        s[2].offset.baseVal = outerBorder;
        const g = rippleGrad.grad;
        g.r.baseVal.value = radius;
        g.cx.baseVal.value = x;
        g.cy.baseVal.value = y;
    };

    return {
        schema: REVEAL_SCHEMA,
        tracksPointer: true,
        reach(width: number, height: number) {
            return Math.max(width, height);
        },
        // The fallback is read live, as in write.
        pressRemaining(now: number) {
            return interaction.pressRemaining(now, useFallback(appearance()) ? null : style);
        },
        attach(container) {
            svg = el('svg', { 'aria-hidden': 'true' });
            svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;';
            const defs = el('defs');
            borderGrad = gradient('border', 2);
            fillGrad = gradient('fill', 2);
            rippleGrad = gradient('ripple', 3);
            defs.appendChild(borderGrad.grad);
            defs.appendChild(fillGrad.grad);
            defs.appendChild(rippleGrad.grad);
            border = el('path', { 'fill-rule': 'evenodd' });
            fill = el('path');
            ripple = el('path');
            for (const p of [border, fill, ripple]) p.style.fill = 'transparent';
            svg.appendChild(defs);
            svg.appendChild(border);
            svg.appendChild(fill);
            svg.appendChild(ripple);
            container.appendChild(svg);
        },
        detach() {
            if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
            svg = null;
        },
        write(f: SurfaceFrame) {
            if (!svg) return false;
            // The fade of a motion, on the SVG itself (see SurfaceFrame.opacity). Surfaces from
            // before motion() give no opacity.
            const alpha = f.opacity === undefined || f.opacity >= 1 ? '1' : String(f.opacity);
            if (svg.style.opacity !== alpha) svg.style.opacity = alpha;
            if (f.changed.style || f.changed.size || f.changed.tilt || f.changed.motion) {
                const { paint } = f;
                svg.setAttribute('viewBox', `${paint.left} ${paint.top} ${paint.width} ${paint.height}`);
                // A projected frame (Firefox during a 3D motion) has flat containers: the shape is
                // drawn through the tilt, as closed polylines (innerToSvgPath writes one).
                const tilt = f.projected ? f.tilt : null;
                const outline = tilt ? innerToSvgPath(projectContour(f.shape.outline, tilt)) : toSvgPath(f.shape.outline);
                const inner = tilt ? innerToSvgPath(f.ringInner().map((p) => apply(tilt, p))) : innerToSvgPath(f.ringInner());
                border.setAttribute('d', `${outline} ${inner}`);
                fill.setAttribute('d', outline);
                ripple.setAttribute('d', outline);
                painted = { x: NaN, y: NaN };
            }
            if (f.changed.style || f.changed.size) style = null;

            // The geometry above is kept current in fallback too, so the paths are right when it
            // ends. Like WinUI's RevealBrush, the fallback is a solid color with no light: the
            // paths stay transparent, and the press is dropped so no ripple resumes.
            if (f.appearance && useFallback(f.appearance)) {
                clear();
                interaction.reset();
                return false;
            }

            const pointer = f.pointer;
            if (!style && (pointer || interaction.pressed)) {
                style = styleFrom(f);
                applyStyle(style);
            }
            const { playing, cleared } = interaction.update(pointer, f.now, style);
            if (cleared) clear();
            if (!style || (!pointer && !playing)) {
                clear();
                return false;
            }
            const c = style;

            // From SvgConfig.paint.
            // A keyboard press has no pointer to light: only its ripple, at the center, is drawn.
            const hovering = !!pointer && pointer.pointerType !== 'keyboard';
            const relativeX = pointer ? pointer.x : NaN;
            const relativeY = pointer ? pointer.y : NaN;
            if (!playing && relativeX === painted.x && relativeY === painted.y) return false;
            const maxRadius = Math.max(borderGrad.grad.r.baseVal.value, fillGrad.grad.r.baseVal.value);
            // The light is drawn where the shape is: the render area is tested there too.
            const light = drawnPoint(f, relativeX, relativeY);
            const area = drawnArea(f);
            const mouseInRenderArea =
                light.x + maxRadius > area.left &&
                light.x - maxRadius < area.left + area.width &&
                light.y + maxRadius > area.top &&
                light.y - maxRadius < area.top + area.height;
            if (!mouseInRenderArea && !playing) {
                clear();
                return false;
            }
            dirty = true;
            painted = { x: relativeX, y: relativeY };

            if (hovering) {
                borderGrad.grad.cx.baseVal.value = fillGrad.grad.cx.baseVal.value = light.x;
                borderGrad.grad.cy.baseVal.value = fillGrad.grad.cy.baseVal.value = light.y;
                const inside = relativeX > 0 && relativeY > 0 && relativeX < f.width && relativeY < f.height;
                setFill(fill, c.hoverLight && inside ? `url(#${id}-fill)` : 'transparent');
                const diffuse = (c.diffuse && mouseInRenderArea) || inside;
                const hasBorder = f.borderWidths.some((w) => w > 0);
                setFill(border, hasBorder && diffuse ? `url(#${id}-border)` : 'transparent');
            } else {
                setFill(fill, 'transparent');
                setFill(border, 'transparent');
            }

            const press = interaction.press;
            if (c.pressAnimation && press.mousePressed && press.mouseDownAnimateLogicFrame) {
                const radius = c.pressAnimationFillMode === 'constrained' ? c.trueFillRadius[1] : Math.max(f.width, f.height);
                const at = press.mouseReleased && press.hasMouseUp ? drawnPoint(f, press.mouseUpX, press.mouseUpY) : light;
                updateRipple(c, press.mouseDownAnimateLogicFrame, at.x, at.y, radius);
                setFill(ripple, `url(#${id}-ripple)`);
            } else {
                setFill(ripple, 'transparent');
            }
            return playing;
        },
    };
}
