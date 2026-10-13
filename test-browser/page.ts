// Browser checks for the <ax-reveal> adapters. Pointer input comes from the driver
// (window.__step / window.__ack), the border detection mode from ?mode=.
import { register } from '../src/index.js';

interface Check {
    name: string;
    ok: boolean;
    detail: string;
}
declare global {
    interface Window {
        __result?: unknown;
        __step?: string;
        __ack?: string;
    }
}

const checks: Check[] = [];
const check = (name: string, ok: boolean, detail = '') => checks.push({ name, ok, detail });
const frames = (n: number) =>
    new Promise<void>((resolve) => {
        const step = () => (n-- <= 0 ? resolve() : requestAnimationFrame(step));
        requestAnimationFrame(step);
    });
const ask = async (step: string) => {
    window.__ack = '';
    window.__step = step;
    while (window.__ack !== step) await frames(1);
    await frames(4);
};
const lit = (id: string) => {
    const c = document.getElementById(id)!.shadowRoot!.querySelector('canvas') as HTMLCanvasElement | null;
    if (!c || !c.width) return 0;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
};

async function run() {
    const mode = new URLSearchParams(location.search).get('mode') as 'strictEdge' | 'experimentalAutoFit';
    register({ borderDetectionMode: mode });
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (m: string) => warnings.push(String(m));
    register({ borderDetectionMode: mode });
    console.warn = warn;
    check('second register() warns and does nothing', warnings.length === 1);
    await frames(6);

    await ask('hover-r1');
    check('hover lights the element under the pointer', lit('r1') > 1000, `lit=${lit('r1')}`);
    check('the neighbour gets border light', lit('r2') > 0, `lit=${lit('r2')}`);
    const r2 = (document.getElementById('r2') as any).debugState.shape;
    const radii = r2 ? r2.outline.segments.filter((s: any) => s.type === 'arc').map((s: any) => Math.round(s.r)) : [];
    check('data-* corner radius applied', radii.indexOf(16) >= 0 && radii.indexOf(6) >= 0, JSON.stringify(radii));

    // Just outside the boundary, within the light radius of r2 (the rightmost reveal).
    await ask('outside-bound');
    if (mode === 'strictEdge') check('strictEdge: no light outside the boundary', lit('r2') === 0, `lit=${lit('r2')}`);
    else check('experimentalAutoFit: light near the boundary', lit('r2') > 0, `lit=${lit('r2')}`);

    await ask('far');
    check('far away: no light', lit('r1') === 0 && lit('r2') === 0);

    // Press ripple and release.
    await ask('press-r1');
    await frames(20);
    const pressed = lit('r1');
    await ask('release');
    check('press keeps the element lit with the ripple', pressed > 1000, `lit=${pressed}`);

    // <ax-reveal-ng>: gradients carry real colors (the original set invalid "r, g, b" strings).
    await ask('hover-ng');
    const ng = document.getElementById('ng')!.shadowRoot!;
    const stop = ng.querySelector('radialGradient stop') as SVGStopElement | null;
    const fillPath = ng.querySelectorAll('path')[1] as SVGPathElement | undefined;
    check('ng gradient stop has the reveal color', !!stop && /255,\s*0,\s*0/.test(getComputedStyle(stop).stopColor), stop ? getComputedStyle(stop).stopColor : 'none');
    check('ng hover fill uses the gradient', !!fillPath && fillPath.style.fill.indexOf('url(') === 0, fillPath ? fillPath.style.fill : 'none');

    return { userAgent: navigator.userAgent, checks };
}

run().then(
    (r) => (window.__result = r),
    (e) => (window.__result = { error: String((e && e.stack) || e) })
);
