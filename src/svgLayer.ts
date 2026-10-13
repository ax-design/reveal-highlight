// The reveal effect as an SVG layer (<ax-reveal-ng>, <ax-surface layers="reveal-svg">), ported
// from the original SVG renderer: three radial gradients (border light, hover fill, ripple) on
// paths of the surface shape. Fixes one bug of the original: gradient stop colors were set to
// bare "r, g, b" strings, which are not colors, so every stop rendered black.
import { innerToSvgPath, toSvgPath } from '@ax-design/shape';
import type { SurfaceFrame, SurfaceLayer } from '@ax-design/surface';
import { RevealInteraction } from './interaction.js';
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
            if (f.changed.style || f.changed.size || f.changed.tilt) {
                const { paint } = f;
                svg.setAttribute('viewBox', `${paint.left} ${paint.top} ${paint.width} ${paint.height}`);
                const outline = toSvgPath(f.shape.outline);
                border.setAttribute('d', `${outline} ${innerToSvgPath(f.ringInner())}`);
                fill.setAttribute('d', outline);
                ripple.setAttribute('d', outline);
                painted = { x: NaN, y: NaN };
            }
            if (f.changed.style || f.changed.size) style = null;

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
            const relativeX = pointer ? pointer.x : NaN;
            const relativeY = pointer ? pointer.y : NaN;
            if (!playing && relativeX === painted.x && relativeY === painted.y) return false;
            const maxRadius = Math.max(borderGrad.grad.r.baseVal.value, fillGrad.grad.r.baseVal.value);
            const mouseInRenderArea =
                relativeX + maxRadius > 0 && relativeX - maxRadius < f.width && relativeY + maxRadius > 0 && relativeY - maxRadius < f.height;
            if (!mouseInRenderArea && !playing) {
                clear();
                return false;
            }
            dirty = true;
            painted = { x: relativeX, y: relativeY };

            if (pointer) {
                borderGrad.grad.cx.baseVal.value = fillGrad.grad.cx.baseVal.value = relativeX;
                borderGrad.grad.cy.baseVal.value = fillGrad.grad.cy.baseVal.value = relativeY;
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
                const x = press.mouseReleased && press.hasMouseUp ? press.mouseUpX : relativeX;
                const y = press.mouseReleased && press.hasMouseUp ? press.mouseUpY : relativeY;
                updateRipple(c, press.mouseDownAnimateLogicFrame, x, y, radius);
                setFill(ripple, `url(#${id}-ripple)`);
            } else {
                setFill(ripple, 'transparent');
            }
            return playing;
        },
    };
}
