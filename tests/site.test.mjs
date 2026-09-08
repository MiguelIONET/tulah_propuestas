import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const variants = ['propuesta-neumorfismo', 'propuesta-glassmorfismo'];
const pages = ['index.html', 'nosotros.html', 'productos.html', 'sinergia.html', 'identidad.html', 'contacto.html'];
const requiredAssets = ['css/styles.css', 'js/data.js', 'js/main.js', 'js/components.js'];

function file(path) {
  return resolve(root, path);
}

function read(path) {
  return readFileSync(file(path), 'utf8');
}

function loadScripts(variant) {
  const sandbox = {
    window: {},
    console,
    URLSearchParams,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(read(`${variant}/js/data.js`), sandbox, { filename: 'data.js' });
  vm.runInContext(read(`${variant}/js/main.js`), sandbox, { filename: 'main.js' });
  return sandbox.window;
}

test('both proposals expose the complete six-page structure', () => {
  for (const variant of variants) {
    for (const page of pages) {
      assert.ok(existsSync(file(`${variant}/${page}`)), `Missing ${variant}/${page}`);
    }
    for (const asset of requiredAssets) {
      assert.ok(existsSync(file(`${variant}/${asset}`)), `Missing ${variant}/${asset}`);
    }
  }
});

test('every page exposes accessible landmarks and resolvable local navigation', () => {
  for (const variant of variants) {
    for (const page of pages) {
      const html = read(`${variant}/${page}`);
      assert.match(html, /<meta\s+name="viewport"/i, `${variant}/${page} needs a viewport`);
      assert.match(html, /<title>[^<]+<\/title>/i, `${variant}/${page} needs a title`);
      assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${variant}/${page} needs one h1`);
      assert.match(html, /<site-navbar\b/i, `${variant}/${page} needs site-navbar`);
      assert.match(html, /<site-footer\b/i, `${variant}/${page} needs site-footer`);
      assert.match(html, /<whatsapp-float\b/i, `${variant}/${page} needs whatsapp-float`);
      assert.match(html, /<link\s+rel="icon"\s+href="assets\/logo-tulah\.svg"/i, `${variant}/${page} needs a local favicon`);

      const localTargets = [...html.matchAll(/(?:href|src)="([^"]+)"/gi)]
        .map((match) => match[1].split('#')[0].split('?')[0])
        .filter((target) => target && !/^(?:https?:|tel:|mailto:|#)/i.test(target));
      for (const target of localTargets) {
        assert.ok(existsSync(resolve(dirname(file(`${variant}/${page}`)), target)), `Broken local target ${target} in ${variant}/${page}`);
      }
    }
  }
});

test('all page titles are unique inside each proposal', () => {
  for (const variant of variants) {
    const titles = pages.map((page) => read(`${variant}/${page}`).match(/<title>([^<]+)<\/title>/i)?.[1]);
    assert.equal(new Set(titles).size, pages.length, `${variant} contains duplicate page titles`);
  }
});

test('product and contact pages mount their interactive components', () => {
  for (const variant of variants) {
    assert.match(read(`${variant}/productos.html`), /<product-catalog\b/i);
    assert.match(read(`${variant}/contacto.html`), /<contact-form\b/i);
  }
});

test('shared data preserves Tulah phone, full catalog, and partner depth', () => {
  for (const variant of variants) {
    const { TULAH_DATA } = loadScripts(variant);
    assert.equal(TULAH_DATA.phone, '528114744867');
    assert.equal(TULAH_DATA.displayPhone, '+52 81 1474 4867');
    assert.ok(TULAH_DATA.products.length >= 18, `${variant} needs all product families`);
    assert.ok(TULAH_DATA.brands.length >= 40, `${variant} needs the source partner list`);
  }
});

test('catalog search is accent-insensitive and searches subcategories', () => {
  for (const variant of variants) {
    const { TULAH_DATA, TulahUtils } = loadScripts(variant);
    const visual = TulahUtils.filterProducts(TULAH_DATA.products, 'proteccion visual', 'all');
    assert.equal(visual.length, 1);
    assert.equal(visual[0].id, 'visual');

    const gloves = TulahUtils.filterProducts(TULAH_DATA.products, 'guantes', 'all');
    assert.ok(gloves.some((product) => product.id === 'manos'));

    const none = TulahUtils.filterProducts(TULAH_DATA.products, 'producto inexistente', 'all');
    assert.equal(none.length, 0);
  }
});

test('WhatsApp URLs use the approved number and encoded message', () => {
  for (const variant of variants) {
    const { TulahUtils } = loadScripts(variant);
    assert.equal(
      TulahUtils.buildWhatsAppUrl('Hola, necesito lentes & guantes'),
      'https://wa.me/528114744867?text=Hola%2C%20necesito%20lentes%20%26%20guantes',
    );
  }
});

test('contact validation reports required fields and accepts valid inquiries', () => {
  for (const variant of variants) {
    const { TulahUtils } = loadScripts(variant);
    const invalid = TulahUtils.validateContact({ name: '', email: 'x', message: '' });
    assert.equal(invalid.valid, false);
    assert.deepEqual(Object.keys(invalid.errors), ['name', 'email', 'message']);

    const valid = TulahUtils.validateContact({
      name: 'María López',
      email: 'maria@example.com',
      message: 'Necesito una cotización de protección visual.',
    });
    assert.equal(valid.valid, true);
    assert.equal(Object.keys(valid.errors).length, 0);
  }
});

test('neumorphic proposal exposes an accessible raised-surface design system', () => {
  const css = read('propuesta-neumorfismo/css/styles.css');
  assert.match(css, /--surface\s*:/);
  assert.match(css, /--shadow-light\s*:/);
  assert.match(css, /--shadow-dark\s*:/);
  assert.match(css, /prefers-reduced-motion/);
  assert.ok((css.match(/@media\b/g) || []).length >= 3);
  for (const page of pages) {
    assert.match(read(`propuesta-neumorfismo/${page}`), /data-theme="neumorphism"/);
  }
});

test('glass proposal exposes layered translucent surfaces with a solid fallback', () => {
  const css = read('propuesta-glassmorfismo/css/styles.css');
  assert.match(css, /--glass\s*:/);
  assert.match(css, /--glow\s*:/);
  assert.match(css, /backdrop-filter/);
  assert.match(css, /prefers-reduced-motion/);
  assert.ok((css.match(/@media\b/g) || []).length >= 3);
  for (const page of pages) {
    assert.match(read(`propuesta-glassmorfismo/${page}`), /data-theme="glassmorphism"/);
  }
});

test('both proposals render without remote CSS dependencies', () => {
  for (const variant of variants) {
    const css = read(`${variant}/css/styles.css`);
    assert.doesNotMatch(css, /@import\s+url\(['"]?https?:/i, `${variant} depends on a remote stylesheet or font`);
  }
});
