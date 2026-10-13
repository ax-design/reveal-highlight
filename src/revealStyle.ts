// Reveal properties and how they turn into the painter style. Shared by the canvas and SVG
// layers.
import type { PropertySpec, Rgba } from '@ax-design/typed-om';
import type { SurfaceFrame } from '@ax-design/surface';
import { MAGIC_DEFAULT_COLOR } from './variables.js';
import type { RevealStyle } from './painter.js';

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

export function styleFrom(frame: SurfaceFrame): RevealStyle {
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

