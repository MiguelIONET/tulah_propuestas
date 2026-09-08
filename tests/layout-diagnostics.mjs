import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const endpoint = 'http://127.0.0.1:9222';
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = spawn(edge, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--remote-allow-origins=*',
  '--remote-debugging-port=9222',
  '--user-data-dir=C:\\Users\\Miguel Angel Vergara\\Desktop\\Tulah\\tmp_edge_remote_diag3',
  'about:blank',
], { stdio: 'ignore' });
const targets = [
  { name: 'neo_inicio', url: 'http://127.0.0.1:8765/propuesta-neumorfismo/index.html' },
  { name: 'neo_productos', url: 'http://127.0.0.1:8765/propuesta-neumorfismo/productos.html', scroll: 'product-catalog' },
  { name: 'glass_inicio', url: 'http://127.0.0.1:8765/propuesta-glassmorfismo/index.html' },
  { name: 'glass_productos', url: 'http://127.0.0.1:8765/propuesta-glassmorfismo/productos.html', scroll: 'product-catalog' },
  { name: 'glass_contacto', url: 'http://127.0.0.1:8765/propuesta-glassmorfismo/contacto.html', scroll: '.contact-grid' },
];

async function inspect(name, url, scroll) {
  const target = await fetch(`${endpoint}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then((response) => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const exceptions = [];
  let nextId = 1;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  await new Promise((resolve) => setTimeout(resolve, 900));
  const expression = `(() => {
    const viewport = innerWidth;
    const offenders = [...document.querySelectorAll('body *')].map((element) => {
      const rect = element.getBoundingClientRect();
      return { element: element.tagName.toLowerCase() + '.' + (element.getAttribute('class') || ''), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    }).filter((item) => item.left < -1 || item.right > viewport + 1).slice(0, 30);
    const menu = document.querySelector('.menu-toggle');
    const menuRect = menu && menu.getBoundingClientRect();
    menu?.click();
    const menuInteraction = menu && {
      expanded: menu.getAttribute('aria-expanded'),
      navOpen: document.querySelector('.main-nav').classList.contains('is-open')
    };
    menu?.click();
    let catalogInteraction = null;
    const catalog = document.querySelector('product-catalog');
    if (catalog) {
      const group = catalog.querySelector('[data-group="Seguridad industrial"]');
      group.click();
      const groupedCount = catalog.querySelectorAll('.product-card').length;
      const search = catalog.querySelector('input[type="search"]');
      search.value = 'gas';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      catalogInteraction = { groupedCount, searchedCount: catalog.querySelectorAll('.product-card').length };
    }
    let contactInteraction = null;
    const form = document.querySelector('.contact-form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      contactInteraction = { invalidFields: form.querySelectorAll('[aria-invalid="true"]').length };
    }
    return {
      viewport,
      visualViewport: Math.round(visualViewport.width),
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      catalogDefined: Boolean(customElements.get('product-catalog')),
      catalogChildren: document.querySelector('product-catalog')?.children.length ?? null,
      catalogHtmlLength: document.querySelector('product-catalog')?.innerHTML.length ?? null,
      catalogSectionOpacity: document.querySelector('.catalog-section') && getComputedStyle(document.querySelector('.catalog-section')).opacity,
      menu: menu && { display: getComputedStyle(menu).display, left: Math.round(menuRect.left), right: Math.round(menuRect.right) },
      menuInteraction,
      catalogInteraction,
      contactInteraction,
      offenders
    };
  })()`;
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  let afterScroll = null;
  if (scroll) {
    const position = await send('Runtime.evaluate', { expression: `Math.max(0, Math.round(document.querySelector(${JSON.stringify(scroll)}).getBoundingClientRect().top - 110))`, returnByValue: true });
    await send('Input.synthesizeScrollGesture', { x: 200, y: 700, yDistance: -position.result.value, speed: 900 });
    await new Promise((resolve) => setTimeout(resolve, 900));
    const scrollResult = await send('Runtime.evaluate', { expression: `(() => { const target = document.querySelector(${JSON.stringify(scroll)}); const reveal = target.closest('[data-reveal]'); return { scrollY: Math.round(scrollY), targetTop: Math.round(target.getBoundingClientRect().top), revealClass: reveal?.className || '', opacity: reveal && getComputedStyle(reveal).opacity }; })()`, returnByValue: true });
    afterScroll = scrollResult.result.value;
  }
  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  writeFileSync(`tmp_cdp_${name}_mobile.png`, Buffer.from(screenshot.data, 'base64'));
  socket.close();
  await fetch(`${endpoint}/json/close/${target.id}`);
  return { url, exceptions, afterScroll, ...result.result.value };
}

for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    const response = await fetch(`${endpoint}/json/version`);
    if (response.ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}

try {
  for (const target of targets) {
    const result = await inspect(target.name, target.url, target.scroll);
    console.log(JSON.stringify(result));
    assert.equal(result.exceptions.length, 0, `${target.name} emitted a browser exception`);
    assert.equal(result.menu.display, 'flex', `${target.name} did not expose the mobile menu button`);
    assert.deepEqual(result.menuInteraction, { expanded: 'true', navOpen: true }, `${target.name} did not open its mobile menu`);
    if (target.name.includes('productos')) {
      assert.equal(result.afterScroll.opacity, '1', `${target.name} remained invisible after user scroll`);
      assert.deepEqual(result.catalogInteraction, { groupedCount: 5, searchedCount: 1 }, `${target.name} catalog controls did not filter correctly`);
    }
    if (target.name.includes('contacto')) assert.equal(result.contactInteraction.invalidFields, 3, `${target.name} contact form did not expose three validation errors`);
  }
} finally {
  browser.kill();
}
