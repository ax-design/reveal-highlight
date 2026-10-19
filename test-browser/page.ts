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
// The canvas of a surface element (<ax-reveal> or <ax-surface>), and the lit pixels in a device px box.
const canvasOf = (el: Element) => el.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
const litIn = (c: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number) => {
    const d = c.getContext('2d')!.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
};
// Lit pixels at the middle of the left and right edges and in the corners: far from the center.
const edgeLit = (c: HTMLCanvasElement) => {
    const w = c.width;
    const h = c.height;
    const my = Math.floor(h / 2);
    return (
        litIn(c, 0, my - 3, 3, my + 3) +
        litIn(c, w - 3, my - 3, w, my + 3) +
        litIn(c, 0, 0, 3, 3) +
        litIn(c, w - 3, 0, w, 3) +
        litIn(c, 0, h - 3, 3, h) +
        litIn(c, w - 3, h - 3, w, h)
    );
};
// Waits for `ms` on frames. Past the 50 ms tilt tween of a press, which element.pressRemaining()
// also reports, but well before the ripple (about 290 ms after a release) has finished.
const wait = async (ms: number) => {
    const end = performance.now() + ms;
    while (performance.now() < end) await frames(1);
};
// Waits until the press feedback of an element has finished; false when it takes too long.
const settle = async (el: any) => {
    const deadline = performance.now() + 3000;
    while (el.pressRemaining() > 0 && performance.now() < deadline) await frames(1);
    return el.pressRemaining() === 0;
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

    // Presses from press() with no pointer: the ripple is centered, and no light is drawn.
    await ask('far');
    const kb = document.getElementById('free') as any;
    const kbCanvas = canvasOf(kb);
    kb.press();
    await frames(2);
    const center = (c: HTMLCanvasElement) =>
        litIn(c, Math.floor(c.width / 2) - 6, Math.floor(c.height / 2) - 6, Math.floor(c.width / 2) + 6, Math.floor(c.height / 2) + 6);
    check('keyboard press: canvas ripple is lit at the center', center(kbCanvas) > 0, `lit=${center(kbCanvas)}`);
    check('keyboard press: no border or hover light at the edges', edgeLit(kbCanvas) === 0, `lit=${edgeLit(kbCanvas)}`);
    const held = kb.pressRemaining();
    check('pressRemaining: a held press counts as released now', held > 0, `ms=${held}`);
    kb.release();
    await frames(1);
    // The estimate made now must predict the moment the ripple really finishes.
    const t1 = performance.now();
    const first = kb.pressRemaining();
    await frames(3);
    const later = kb.pressRemaining();
    check('pressRemaining: positive after release', first > 0, `ms=${first}`);
    check('pressRemaining: decreases over time', later < first, `first=${first} later=${later}`);
    const finished = await settle(kb);
    const t2 = performance.now();
    check('pressRemaining: reaches 0 when the ripple finishes', finished && Math.abs(t1 + first - t2) < 80, `predicted=${Math.round(t1 + first)} actual=${Math.round(t2)}`);
    await frames(2);
    check('pressRemaining: no ripple pixels once it is 0', litIn(kbCanvas, 0, 0, kbCanvas.width, kbCanvas.height) === 0);

    const kbng = document.getElementById('free-ng') as any;
    kbng.press();
    await frames(2);
    check('keyboard press: svg ripple is the only drawn path', drawnPaths('free-ng') === 1, `paths=${drawnPaths('free-ng')}`);
    const kbngPaths = kbng.shadowRoot.querySelectorAll('path') as NodeListOf<SVGPathElement>;
    check('keyboard press: svg ripple uses the ripple gradient', kbngPaths[2].style.fill.indexOf('url(') === 0, kbngPaths[2].style.fill);
    kbng.release();
    await wait(120);
    check('svg pressRemaining: positive after release', kbng.pressRemaining() > 0, `ms=${kbng.pressRemaining()}`);
    check('svg pressRemaining: reaches 0 once the ripple has finished', await settle(kbng));

    const surface = document.getElementById('surface') as any;
    surface.press();
    await frames(2);
    const surfaceCanvas = canvasOf(surface);
    check('ax-surface keyboard press: centered ripple, no edge light', center(surfaceCanvas) > 0 && edgeLit(surfaceCanvas) === 0, `center=${center(surfaceCanvas)} edges=${edgeLit(surfaceCanvas)}`);
    surface.release();
    await wait(120);
    check('ax-surface pressRemaining: positive after release', surface.pressRemaining() > 0, `ms=${surface.pressRemaining()}`);
    check('ax-surface pressRemaining: reaches 0 once the ripple has finished', await settle(surface));

    // --reveal-press-animation: false: nothing to wait for.
    kb.style.setProperty('--reveal-press-animation', 'false');
    await frames(4);
    kb.press();
    await frames(2);
    kb.release();
    await wait(120);
    check('press animation off: pressRemaining is 0', kb.pressRemaining() === 0, `ms=${kb.pressRemaining()}`);
    kb.style.removeProperty('--reveal-press-animation');
    await frames(4);

    // A press under way when the fallback starts: the ripple stops before the next frame.
    kb.press();
    await frames(2);
    await wait(120);
    const heldBefore = kb.pressRemaining();
    setAlwaysUseFallback(true);
    const atOnce = kb.pressRemaining();
    setAlwaysUseFallback(false);
    kb.release();
    check('AlwaysUseFallback mid-press: the wait stops at once', heldBefore > 0 && atOnce === 0, `before=${heldBefore} at once=${atOnce}`);
    check('AlwaysUseFallback mid-press: the ripple then finishes', await settle(kb));

    // AlwaysUseFallback: the layer draws nothing, so there is nothing to wait for.
    setAlwaysUseFallback(true);
    kb.press();
    await frames(2);
    const fallbackDuring = kb.pressRemaining();
    const fallbackPixels = litIn(kbCanvas, 0, 0, kbCanvas.width, kbCanvas.height);
    kb.release();
    await wait(120);
    const fallbackAfter = kb.pressRemaining();
    setAlwaysUseFallback(false);
    check('AlwaysUseFallback: pressRemaining is 0', fallbackDuring === 0 && fallbackAfter === 0, `during=${fallbackDuring} after=${fallbackAfter}`);
    check('AlwaysUseFallback: no ripple pixels', fallbackPixels === 0, `lit=${fallbackPixels}`);

    return { userAgent: navigator.userAgent, checks };
}

run().then(
    (r) => (window.__result = r),
    (e) => (window.__result = { error: String((e && e.stack) || e) })
);
