// Browser checks for the <ax-reveal> adapters. Pointer input comes from the driver
// (window.__step / window.__ack), the border detection mode from ?mode=.
import { setAlwaysUseFallback } from '@ax-design/surface';
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
        // Set by the driver for 'media:' steps: whether it could emulate the media feature.
        __media?: boolean;
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
// Paths of <ax-reveal-ng> that have a fill other than transparent (border, hover fill, ripple).
const drawnPaths = (id: string) =>
    Array.from(document.getElementById(id)!.shadowRoot!.querySelectorAll('path')).filter((p) => p.style.fill !== 'transparent').length;

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

    // Fallback, as WinUI's RevealBrush: no light while AlwaysUseFallback is on. The first frame
    // after it is turned off draws again, with the pointer where it was (no pointer move).
    setAlwaysUseFallback(true);
    await ask('hover-r1');
    check('AlwaysUseFallback: canvas draws no light', lit('r1') === 0, `lit=${lit('r1')}`);
    setAlwaysUseFallback(false);
    await frames(6);
    check('AlwaysUseFallback off: canvas lights up again', lit('r1') > 1000, `lit=${lit('r1')}`);

    setAlwaysUseFallback(true);
    await ask('hover-ng');
    check('AlwaysUseFallback: svg draws no light', drawnPaths('ng') === 0, `paths=${drawnPaths('ng')}`);
    setAlwaysUseFallback(false);
    await frames(6);
    const ngFill = (ng.querySelectorAll('path')[1] as SVGPathElement).style.fill;
    check('AlwaysUseFallback off: svg lights up again', ngFill.indexOf('url(') === 0, ngFill);

    // Forced colors (Playwright only; the driver reports whether it could emulate the feature).
    await ask('media:forcedColors=active');
    if (window.__media) {
        await ask('hover-r1');
        check('forced colors: canvas draws no light', lit('r1') === 0, `lit=${lit('r1')}`);
        await ask('hover-ng');
        check('forced colors: svg draws no light', drawnPaths('ng') === 0, `paths=${drawnPaths('ng')}`);
        // The button at rest, with the pointer away from it: the border is ButtonText, resolved
        // through a probe that keeps the system color.
        await ask('far');
        const probe = document.createElement('div');
        probe.style.cssText = 'color: ButtonText; forced-color-adjust: none;';
        document.body.appendChild(probe);
        const buttonText = getComputedStyle(probe).color;
        probe.remove();
        const button = document.querySelector('#r1 .ax-reveal-button') as HTMLElement;
        const border = getComputedStyle(button);
        check('forced colors: button border at rest is ButtonText', border.borderTopColor === buttonText, `border=${border.borderTopColor} ButtonText=${buttonText}`);
        check('forced colors: button has a border', parseFloat(border.borderTopWidth) > 0, `width=${border.borderTopWidth}`);
        await ask('media:forcedColors=none');
        await frames(6);
        await ask('hover-ng');
        const fill = (ng.querySelectorAll('path')[1] as SVGPathElement).style.fill;
        check('forced colors off: svg lights up again', fill.indexOf('url(') === 0, fill);
        await ask('hover-r1');
        check('forced colors off: canvas lights up again', lit('r1') > 1000, `lit=${lit('r1')}`);
    }

    return { userAgent: navigator.userAgent, checks };
}

run().then(
    (r) => (window.__result = r),
    (e) => (window.__result = { error: String((e && e.stack) || e) })
);
