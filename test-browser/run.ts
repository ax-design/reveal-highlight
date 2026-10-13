// Builds and runs the browser test in both border detection modes.
// Usage: bun test-browser/run.ts [chromium|firefox|webkit|safari ...]
import { join } from 'node:path';

const dir = import.meta.dir;
const dist = join(dir, 'dist');
if (!process.env.SKIP_BUILD) {
    // Sibling packages resolve to their sources through the `source` export condition.
    const result = await Bun.build({ entrypoints: [join(dir, 'page.html')], outdir: dist, conditions: ['source'] });
    if (!result.success) throw new Error(result.logs.join('\n'));
}
const server = Bun.serve({
    port: 0,
    fetch(req) {
        const path = new URL(req.url).pathname;
        const file = Bun.file(join(dist, path === '/' ? 'page.html' : path));
        return file.size ? new Response(file) : new Response('', { status: 404 });
    },
});

interface Driver {
    eval<T>(script: string): Promise<T>;
    move(x: number, y: number): Promise<void>;
    down(): Promise<void>;
    up(): Promise<void>;
    close(): Promise<void>;
}

async function playwright(name: string, url: string): Promise<Driver> {
    const pw = (await import('playwright')) as any;
    const browser = await pw[name].launch();
    const page = await browser.newPage({ viewport: { width: 700, height: 400 } });
    await page.goto(url);
    return {
        eval: (script) => page.evaluate(script),
        move: (x, y) => page.mouse.move(x, y),
        down: () => page.mouse.down(),
        up: () => page.mouse.up(),
        close: () => browser.close(),
    };
}

async function safari(url: string): Promise<Driver> {
    const port = 4462;
    const proc = Bun.spawn(['safaridriver', '-p', String(port)]);
    await Bun.sleep(1000);
    const call = async (method: string, path: string, body?: unknown) => {
        const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        const json = (await res.json()) as { value: any };
        if (json.value && json.value.error) throw new Error(json.value.message);
        return json.value;
    };
    const sid = (await call('POST', '/session', { capabilities: {} })).sessionId;
    await call('POST', `/session/${sid}/window/rect`, { width: 700, height: 500 });
    await call('POST', `/session/${sid}/url`, { url });
    const pointer = (actions: unknown[]) =>
        call('POST', `/session/${sid}/actions`, { actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions }] });
    return {
        eval: (script) => call('POST', `/session/${sid}/execute/sync`, { script: `return (${script})`, args: [] }),
        move: (x, y) => pointer([{ type: 'pointerMove', duration: 0, x: Math.round(x), y: Math.round(y), origin: 'viewport' }]),
        down: () => pointer([{ type: 'pointerDown', button: 0 }]),
        up: () => pointer([{ type: 'pointerUp', button: 0 }]),
        async close() {
            await call('DELETE', `/session/${sid}`);
            proc.kill();
        },
    };
}

async function drive(d: Driver) {
    for (;;) {
        const state = await d.eval<{ result: any; step: string; ack: string }>('({ result: window.__result || null, step: window.__step || "", ack: window.__ack || "" })');
        if (state.result) return state.result;
        if (state.step && state.step !== state.ack) {
            const rect = (id: string) => d.eval<{ x: number; y: number; w: number; h: number }>(`(() => { const r = document.getElementById('${id}').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
            if (state.step === 'hover-r1') {
                const r = await rect('r1');
                await d.move(r.x + 30, r.y + 20);
            } else if (state.step === 'outside-bound') {
                const r = await rect('bound');
                await d.move(r.x + r.w + 25, r.y + 10);
            } else if (state.step === 'far') {
                await d.move(690, 390);
            } else if (state.step === 'press-r1') {
                const r = await rect('r1');
                await d.move(r.x + 40, r.y + 20);
                await d.down();
            } else if (state.step === 'release') {
                await d.up();
            } else if (state.step === 'hover-ng') {
                const r = await rect('ng');
                await d.move(r.x + 30, r.y + 20);
            }
            await d.eval(`(window.__ack = ${JSON.stringify(state.step)})`);
        }
        await Bun.sleep(50);
    }
}

let failed = 0;
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ['chromium']) {
    for (const mode of ['strictEdge', 'experimentalAutoFit']) {
        const url = `http://127.0.0.1:${server.port}/?mode=${mode}`;
        const d = name === 'safari' ? await safari(url) : await playwright(name, url);
        let result: any;
        try {
            result = await drive(d);
        } finally {
            await d.close();
        }
        if (result.error) {
            console.log(`${name} ${mode}: ERROR ${result.error}`);
            failed++;
            continue;
        }
        const bad = result.checks.filter((c: any) => !c.ok);
        failed += bad.length;
        console.log(`${name} ${mode}: ${result.checks.length - bad.length}/${result.checks.length} passed`);
        for (const c of bad) console.log(`  FAIL ${c.name}: ${c.detail}`);
    }
}
server.stop();
process.exit(failed ? 1 : 0);
