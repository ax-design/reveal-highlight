// The <ax-reveal> shape API (--reveal-border-* properties and data-* overrides) mapped to the
// surface shape. These are the original public names and initial values; register() registers
// them with the original definitions.
import type { CornerShape, Quad, ShapeSpec } from '@ax-design/shape';
import type { Values } from '@ax-design/surface';
import type { PropertySpec } from '@ax-design/typed-om';

const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
// data-* overrides on the element, read before the CSS value (as BaseConfig did).
const CORNER_DATA = ['topLeftBorderRadius', 'topRightBorderRadius', 'bottomRightBorderRadius', 'bottomLeftBorderRadius'];
const SIDES = ['top', 'right', 'bottom', 'left'];
const SIDE_DATA = ['topBorder', 'rightBorder', 'bottomBorder', 'leftBorder'];

const length = (name: string, initial: string): PropertySpec => ({ name, syntax: { type: 'length' }, initial, inherits: true });

export const LEGACY_SHAPE_SCHEMA: PropertySpec[] = [
    length('--reveal-border-width', '1px'),
    { name: '--reveal-border-decoration-type', syntax: { type: 'keyword', values: ['miter', 'round', 'bevel'] }, initial: 'miter', inherits: true },
    length('--reveal-border-decoration-radius', '0px'),
    ...CORNERS.map((c) => length(`--reveal-border-decoration-${c}-radius`, '-1px')),
    ...SIDES.map((s): PropertySpec => ({ name: `--reveal-border-${s}-type`, syntax: { type: 'keyword', values: ['line', 'none'] }, initial: 'line', inherits: true })),
];

export function legacyShapeSpec(v: Values, element: HTMLElement, width: number, height: number): ShapeSpec {
    const type = v.keyword('--reveal-border-decoration-type') || 'miter';
    const general = v.length('--reveal-border-decoration-radius');
    const shape: CornerShape = type === 'bevel' ? 'bevel' : 'round';
    const corners = CORNERS.map((c, i) => {
        const data = element.dataset[CORNER_DATA[i]];
        const own = data ? parseFloat(data) : v.length(`--reveal-border-decoration-${c}-radius`);
        // miter is the plain rectangle.
        const radius = type === 'miter' ? 0 : own >= 0 ? own : general;
        return { radius, shape, shiftX: 0, shiftY: 0 };
    }) as ShapeSpec['corners'];
    const flat = { kind: 'flat' as const, depth: 0, span: 0, at: 0.5, ratio: 0.5, tipRadius: 0, shoulderRadius: 0 };
    return { width, height, corners, edges: [flat, flat, flat, flat] };
}

export function legacyBorderWidths(v: Values, element: HTMLElement): Quad<number> {
    const width = Math.max(0, v.length('--reveal-border-width'));
    return SIDES.map((s, i) => {
        const type = element.dataset[SIDE_DATA[i]] || v.keyword(`--reveal-border-${s}-type`);
        return type === 'line' ? width : 0;
    }) as Quad<number>;
}
