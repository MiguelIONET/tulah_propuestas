import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, createReadStream, existsSync, statSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const previews = join(root, 'docs', 'previews');
mkdirSync(previews, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'tulah-video-qa-'));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = createServer((req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!path.startsWith(root + sep) || !existsSync(path) || !statSync(path).isFile()) return res.writeHead(404).end();
  const size = statSync(path).size;
  const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if (range) {
    const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size) return res.writeHead(416, { 'Content-Range': 'bytes */' + size }).end();
    res.writeHead(206, { 'Content-Type': mime[extname(path)], 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': end - start + 1 });
    createReadStream(path, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    createReadStream(path).pipe(res);
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert.ok(edge, 'Microsoft Edge is required for this browser verification');
const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = await fn(); if (value) return value; await sleep(100); }
  throw new Error('Timeout: ' + label);
}
let socket;
let send;
let total = 0;
try {
  await until(() => existsSync(join(profile, 'DevToolsActivePort')), 'Edge startup', 45000);
  const port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
  const endpoint = 'http://127.0.0.1:' + port;
  const target = await fetch(endpoint + '/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { socket.addEventListener('open', r, { once: true }); socket.addEventListener('error', j, { once: true }); });
  const pending = new Map();
  const exceptions = [];
  let id = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    if (pending.has(message.id)) {
      const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer);
      message.error ? p.reject(new Error(message.error.message)) : p.resolve(message.result);
    }
  });
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(n, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const value = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (value.exceptionDetails) throw new Error(value.exceptionDetails.text);
    return value.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  const navigate = async (url, width, reduced = false) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 800 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 800 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
    await send('Page.navigate', { url });
    await send('Page.bringToFront');
    await until(() => evaluate("document.readyState === 'complete' && !!document.querySelector('.main-nav')"), 'page loaded');
  };
  const capture = async name => {
    await evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))");
    await until(() => evaluate("document.getAnimations().every(a => a.playState !== 'running')"), 'animations settled before capture');
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(previews, name + '.png'), Buffer.from(shot.data, 'base64'));
  };
  for (const width of [390, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: width < 800});
    await send('Page.navigate', {url: base + '/index.html'});
    await until(() => evaluate("document.readyState === 'complete' && !!document.querySelector('.proposals')"), 'root proposal chooser');
    await evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')");
    await until(() => evaluate("[...document.images].every(i=>i.complete && i.naturalWidth>0)"), 'root previews load');
    assert.ok(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), 'root chooser responsive');
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.open-proposal')].map(a=>a.getAttribute('href'))"), ['propuesta-neumorfismo/index.html','propuesta-glassmorfismo/index.html']);
    await capture('selector-propuestas-' + width);
  }
  console.log('PASS: root proposal chooser at mobile and desktop widths.');
  const pages = ['index', 'nosotros', 'productos', 'sinergia', 'identidad', 'contacto'];
  for (const variant of ['neumorfismo', 'glassmorfismo']) {
    for (const width of [390, 1440]) {
      for (const page of pages) {
        const url = base + '/propuesta-' + variant + '/' + page + '.html';
        await navigate(url, width);
        const layout = await evaluate(`(() => {
          const nav = document.querySelector('.main-nav');
          const logo = document.querySelector('.brand img');
          return {
            width: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
            headings: document.querySelectorAll('h1').length,
            navLinks: nav.querySelectorAll('a').length,
            active: nav.querySelector('[aria-current=page]')?.getAttribute('href'),
            footer: !!document.querySelector('footer'),
            whatsapp: document.querySelector('.whatsapp-float')?.href,
            images: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src),
            background: getComputedStyle(document.body).backgroundColor,
            color: getComputedStyle(document.body).color
          };
        })()`);
        assert.ok(layout.scroll <= width + 1, variant + '/' + page + ' horizontal overflow: ' + JSON.stringify(layout));
        assert.equal(layout.headings, 1);
        assert.equal(layout.navLinks, 7);
        assert.equal(layout.active, page + '.html');
        assert.ok(layout.footer && layout.whatsapp.startsWith('https://wa.me/528114744867'));
        assert.deepEqual(layout.images, []);
        await evaluate("document.querySelectorAll('img').forEach(i => i.loading='eager')");
        await until(() => evaluate("[...document.images].every(i => i.complete && i.naturalWidth > 0)"), 'all page images including footer and offscreen logos');
        assert.ok(await evaluate("[...document.querySelectorAll('.brand img, .footer-brand img')].every(i => i.naturalWidth > 0)"), 'Shared Tulah logos loaded');
        assert.equal(await evaluate("[...document.querySelectorAll('.brand-line, .orbit-brand, .core-symbol, .logo-chip')].filter(el => !el.querySelector('img')).length"), 0, 'No text-only brand placeholders');
        await evaluate("document.fonts.ready");
        assert.ok(await evaluate("document.fonts.check('16px bootstrap-icons') && !!document.querySelector('.whatsapp-float .bi-whatsapp')"), 'Bootstrap icons loaded locally');
        if (page === 'index') {
          assert.ok(await evaluate("document.querySelectorAll('main img[src*=\"assets/marcas/\"]').length >= 4"), 'Homepage partner logos present');
          await evaluate("document.querySelector('.service-card').scrollIntoView({behavior:'instant',block:'center'})");
          await until(() => evaluate("document.querySelector('.service-card').classList.contains('is-revealed')"), 'scroll reveal');
          await evaluate("window.scrollTo({top:0,behavior:'instant'})");
        }
        if (width < 800) {
          await evaluate("document.querySelector('.menu-toggle').click()");
          assert.equal(await evaluate("document.querySelector('.menu-toggle').getAttribute('aria-expanded')"), 'true');
          await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))");
          assert.equal(await evaluate("document.querySelector('.menu-toggle').getAttribute('aria-expanded')"), 'false');
        }
        if (page === 'index') {
          await until(() => evaluate("!document.querySelector('video').paused && document.querySelector('video').currentTime > .15"), 'autoplay');
          const video = await evaluate("({ muted: document.querySelector('video').muted, loop: document.querySelector('video').loop, inline: document.querySelector('video').playsInline, width: document.querySelector('video').videoWidth, duration: document.querySelector('video').duration })");
          assert.ok(video.muted && video.loop && video.inline && video.width > 0);
          await evaluate("document.querySelector('.video-toggle').click()");
          const t = await evaluate("document.querySelector('video').currentTime");
          await sleep(300);
          assert.equal(await evaluate("document.querySelector('video').paused"), true);
          assert.ok(Math.abs(await evaluate("document.querySelector('video').currentTime") - t) < .1);
          assert.ok(await evaluate("(() => {const a=document.querySelector('.video-toggle').getBoundingClientRect(),b=document.querySelector('.whatsapp-float').getBoundingClientRect();return a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top;})()"), 'Video and WhatsApp controls must not overlap');
          await capture(variant + (width < 800 ? '-movil' : '-escritorio'));
          await evaluate("document.querySelector('.video-toggle').click()");
          await until(() => evaluate("!document.querySelector('video').paused"), 'resume');
          await evaluate("document.querySelector('video').currentTime = document.querySelector('video').duration - .25");
          await until(() => evaluate("document.querySelector('video').currentTime < 1"), 'video loop', 7000);
          console.log(variant, width, 'video autoplay/pause/resume/loop OK', video);
          await evaluate("document.querySelector('.brand-line').scrollIntoView({behavior:'instant',block:'center'})");
          await capture(variant + '-inicio-marcas-' + width);
        }
        if (page === 'productos') {
          const products = await evaluate(`(() => {
            const c=document.querySelector('product-catalog');const input=c.querySelector('input');const total=c.querySelectorAll('.product-card').length;
            c.querySelector('[data-group="Corporativos y eventos"]').click();const events=c.querySelectorAll('.product-card').length;
            input.value='globos';input.dispatchEvent(new Event('input'));const match=c.querySelector('.product-card')?.id;
            input.value='zzzz';input.dispatchEvent(new Event('input'));c.querySelector('.empty-state button').click();
            return {total,events,match,reset:c.querySelectorAll('.product-card').length};
          })()`);
          assert.deepEqual(products, { total: 23, events: 2, match: 'eventos', reset: 23 });
          assert.deepEqual(await evaluate("[...document.querySelectorAll('#respiratoria .product-brands img')].map(i=>i.alt)"), ['3M','Moldex','Honeywell'], 'Catalog keeps the right manufacturer logos after filtering');
          assert.deepEqual(await evaluate("[...document.querySelectorAll('#automatizacion .product-brands img')].map(i=>i.alt)"), ['Yaskawa'], 'Use supplied artwork only, never substitute another manufacturer');
          await evaluate("document.querySelector('product-catalog').scrollIntoView({behavior:'instant',block:'start'})");
          await capture(variant + '-productos-' + width);
          if (width > 800) {
            const position = await evaluate("(() => {const r=document.querySelector('.product-card').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+100};})()");
            await send('Input.dispatchMouseEvent', {type:'mouseMoved', ...position});
            await until(() => evaluate("new DOMMatrix(getComputedStyle(document.querySelector('.product-card')).transform).m42 < -1"), 'catalog card hover lift');
            await send('Input.dispatchMouseEvent', {type:'mouseMoved', x:0, y:0});
          }
        }
        if (page === 'productos') {
          await evaluate("document.querySelector('#respiratoria').scrollIntoView({behavior:'instant',block:'center'})");
          await until(() => evaluate("[...document.querySelectorAll('#respiratoria img')].every(i=>i.complete && i.naturalWidth>0)"), 'catalog logo preview');
          await capture(variant + '-catalogo-marcas-' + width);
        }
        if (page === 'identidad' && variant === 'glassmorfismo') {
          await evaluate("document.querySelector('.identity-core').scrollIntoView({behavior:'instant',block:'center'})");
          await capture(variant + '-identidad-logo-' + width);
        }
        if (page === 'sinergia') {
          if (variant === 'glassmorfismo') {
            await evaluate("document.querySelector('.brand-stage').scrollIntoView({behavior:'instant',block:'center'})");
            await capture(variant + '-red-logos-' + width);
          }
          const count = await evaluate("document.querySelectorAll('.partner-directory img').length");
          assert.equal(count, 51, 'All supplied partner logos are visible in the directory');
          await evaluate("document.querySelectorAll('.partner-directory img').forEach(i => i.loading='eager')");
          await until(() => evaluate("[...document.querySelectorAll('.partner-directory img')].every(i => i.complete && i.naturalWidth > 0 && i.alt.trim())"), 'partner logos loaded with accessible names');
          await evaluate("document.querySelector('.partner-directory').scrollIntoView({behavior:'instant',block:'start'})");
          assert.ok(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), 'Logo directory fits viewport');
          await capture(variant + '-logos-' + width);
        }
        if (page === 'contacto') {
          assert.equal(await evaluate("document.querySelectorAll('a[href^=\"mailto:\"]').length >= 2"), true);
          const invalid = await evaluate("document.querySelector('.contact-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));document.querySelectorAll('[aria-invalid=true]').length");
          assert.equal(invalid, 3);
        }
        total++;
      }
    }
    await navigate(base + '/propuesta-' + variant + '/index.html', 390, true);
    const reduced = await evaluate("({paused:document.querySelector('video').paused,source:document.querySelector('video').currentSrc,poster:document.querySelector('.hero-poster').naturalWidth,control:!document.querySelector('.video-toggle').hidden})");
    assert.ok(reduced.paused && !reduced.source && reduced.poster > 0 && reduced.control);
    assert.equal(await evaluate("document.getAnimations().filter(a => a.playState === 'running').length"), 0, 'Reduced motion disables decorative animations');
    await evaluate("document.querySelector('.video-toggle').click()");
    await until(() => evaluate("document.querySelector('video').currentTime > .1"), 'opt in to reduced-motion video');
    await send('Network.setBlockedURLs', { urls: ['*hero-industrial.mp4*'] });
    await navigate(base + '/propuesta-' + variant + '/index.html', 390);
    await until(() => evaluate("document.querySelector('.video-toggle').hidden && document.querySelector('.video-status').textContent.length > 0"), 'unavailable video fallback');
    assert.ok(await evaluate("document.querySelector('.hero-poster').naturalWidth > 0 && document.querySelectorAll('.hero-film .button').length === 2"));
    await send('Network.setBlockedURLs', { urls: [] });
    console.log(variant, 'reduced motion, manual opt-in and missing-video fallback OK');
  }
  assert.deepEqual(exceptions, []);
  console.log('PASS: ' + total + ' page/viewport checks; both video heroes and catalog interactions; zero JavaScript exceptions.');
} finally {
  if (send) await send('Browser.close').catch(() => {});
  socket?.close();
  browser.kill();
  server.closeAllConnections();
  await new Promise(r => server.close(r));
  for (let n=0;n<10;n++) {
    try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); }
  }
}
