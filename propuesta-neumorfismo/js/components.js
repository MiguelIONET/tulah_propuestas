(function () {
  const data = window.TULAH_DATA;
  const utils = window.TulahUtils;

  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const currentFile = () => window.location.pathname.split('/').pop() || 'index.html';
  const icon = (name = 'shield') => {
    const names = { hand: 'hand-index', body: 'person-badge', cone: 'cone-striped', height: 'arrows-vertical', mask: 'mask', helmet: 'shield-check', disposable: 'bandaid', gas: 'speedometer2', ergonomic: 'person-standing', eye: 'eyeglasses', ear: 'ear', boot: 'person-walking', drop: 'droplet-half', box: 'box-seam', sign: 'exclamation-triangle', lock: 'lock', bottle: 'cup-straw', grid: 'gear', shield: 'shield-check', gift: 'gift', event: 'balloon', robot: 'robot' };
    return `<i class="bi bi-${names[name] || 'shield-check'}" aria-hidden="true"></i>`;
  };

  class SiteNavbar extends HTMLElement {
    connectedCallback() {
      const active = currentFile();
      this.innerHTML = `
        <a class="skip-link" href="#contenido">Saltar al contenido</a>
        <header class="site-header">
          <div class="nav-shell">
            <a class="brand" href="index.html" aria-label="Tulah — Inicio">
              <img src="assets/logo-tulah.svg" alt="Tulah" width="148" height="48">
            </a>
            <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-menu">
              <span class="sr-only">Abrir menú</span><i class="bi bi-list" aria-hidden="true"></i>
            </button>
            <nav id="main-menu" class="main-nav" aria-label="Navegación principal">
              ${data.nav.map((item) => `<a href="${item.href}"${item.href === active ? ' aria-current="page"' : ''}>${item.label}</a>`).join('')}
              <a class="button button-small nav-cta" href="contacto.html">Cotizar ahora</a>
            </nav>
          </div>
        </header>`;

      const toggle = this.querySelector('.menu-toggle');
      const nav = this.querySelector('.main-nav');
      const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.querySelector('.bi').className = open ? 'bi bi-x-lg' : 'bi bi-list';
        nav.classList.toggle('is-open', open);
        document.body.classList.toggle('menu-open', open);
        toggle.querySelector('.sr-only').textContent = open ? 'Cerrar menú' : 'Abrir menú';
      };
      toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
      nav.addEventListener('click', (event) => { if (event.target.closest('a')) setOpen(false); });
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
      window.matchMedia('(min-width: 861px)').addEventListener?.('change', (event) => { if (event.matches) setOpen(false); });
    }
  }

  class SiteFooter extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <footer class="site-footer">
          <div class="footer-grid">
            <div class="footer-brand">
              <img src="assets/logo-tulah.svg" alt="Tulah" width="148" height="48">
              <p>Equipo de seguridad y automatización industrial, regalos, globos y más.</p>
              <a class="footer-phone" href="tel:+528114744867">${data.displayPhone}</a>
            </div>
            <div><h2>Explora</h2><ul>${data.nav.map((item) => `<li><a href="${item.href}">${item.label}</a></li>`).join('')}</ul></div>
            <div><h2>Soluciones</h2><ul><li><a href="productos.html?q=proteccion">Protección personal</a></li><li><a href="productos.html?q=seguridad">Seguridad industrial</a></li><li><a href="productos.html?q=automatizacion">Automatización</a></li><li><a href="productos.html?q=promocionales">Regalos y promocionales</a></li><li><a href="productos.html?q=eventos">Eventos corporativos</a></li></ul></div>
            <div><h2>Hablemos</h2><p>${data.location}<br>Atención a la región Noreste</p><p><a href="mailto:juan.salinas@tulah.mx">juan.salinas@tulah.mx</a><br><a href="mailto:viridiana@tulah.mx">viridiana@tulah.mx</a></p><a class="text-link" href="contacto.html">Solicitar asesoría <span aria-hidden="true"><i class="bi bi-arrow-right" aria-hidden="true"></i></span></a></div>
          </div>
          <div class="footer-bottom"><p>© ${new Date().getFullYear()} Tulah. Todos los derechos reservados.</p><p>Seguridad que acompaña.</p></div>
        </footer>`;
    }
  }

  class WhatsAppFloat extends HTMLElement {
    connectedCallback() {
      const page = currentFile().replace('.html', '').replace('index', 'inicio');
      const message = `Hola Tulah, visité la página de ${page} y quisiera recibir asesoría.`;
      this.innerHTML = `<a class="whatsapp-float" href="${utils.buildWhatsAppUrl(message)}" target="_blank" rel="noopener" aria-label="Contactar a Tulah por WhatsApp"><i class="bi bi-whatsapp" aria-hidden="true"></i><span>WhatsApp</span></a>`;
    }
  }

  // These associations follow the named manufacturers in the catalog content.
  const catalogBrandLogos = {
    respiratoria: [['3M', '3M'], ['Moldex', 'Moldex'], ['Honeywell', 'Honeywell']],
    cabeza: [['Jyrsa', 'JYRSA'], ['Honeywell', 'Honeywell'], ['MSA', 'MSA']],
    automatizacion: [['Yaskawa', 'Yaskawa']],
  };
  const productBrands = (id) => {
    const brands = catalogBrandLogos[id];
    if (!brands) return '';
    return `<div class="product-brands" aria-label="Marcas de esta familia">${brands.map(([file, name]) => `<span class="brand-badge"><img src="assets/marcas/${file}.png" alt="${name}" loading="lazy" decoding="async"></span>`).join('')}</div>`;
  };

  class ProductCatalog extends HTMLElement {
    connectedCallback() {
      const groups = [...new Set(data.products.map((product) => product.group))];
      this.state = { query: new URLSearchParams(window.location.search).get('q') || '', group: 'all' };
      this.innerHTML = `
        <div class="catalog-toolbar" role="search">
          <label class="search-field"><span class="sr-only">Buscar productos</span><i class="bi bi-search" aria-hidden="true"></i><input type="search" value="${escapeHtml(this.state.query)}" placeholder="Buscar lentes, guantes, arneses…" autocomplete="off"></label>
          <div class="filter-row" aria-label="Filtrar por familia"><button class="filter-chip is-active" type="button" data-group="all">Todo</button>${groups.map((group) => `<button class="filter-chip" type="button" data-group="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join('')}</div>
        </div>
        <div class="catalog-summary" aria-live="polite"></div><div class="catalog-grid"></div>`;
      this.querySelector('input').addEventListener('input', (event) => { this.state.query = event.target.value; this.renderProducts(); });
      this.querySelector('.filter-row').addEventListener('click', (event) => {
        const button = event.target.closest('[data-group]');
        if (!button) return;
        this.state.group = button.dataset.group;
        this.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.toggle('is-active', chip === button));
        this.renderProducts();
      });
      this.renderProducts();
    }

    renderProducts() {
      const products = utils.filterProducts(data.products, this.state.query, this.state.group);
      this.querySelector('.catalog-summary').textContent = `${products.length} ${products.length === 1 ? 'solución encontrada' : 'soluciones encontradas'}`;
      this.querySelector('.catalog-grid').innerHTML = products.length ? products.map((product) => `
        <article class="product-card" id="${product.id}">
          <div class="product-icon">${icon(product.icon)}</div><p class="card-kicker">${escapeHtml(product.group)}</p><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description)}</p>
          <ul>${product.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          ${productBrands(product.id)}
          <a class="card-action" target="_blank" rel="noopener" href="${utils.buildWhatsAppUrl(`Hola Tulah, deseo cotizar productos de ${product.name}.`)}">Solicitar cotización <span aria-hidden="true"><i class="bi bi-arrow-up-right" aria-hidden="true"></i></span></a>
        </article>`).join('') : `<div class="empty-state"><div class="product-icon">${icon('grid')}</div><h2>No encontramos coincidencias</h2><p>Prueba con otra palabra o consulta todo el catálogo.</p><button class="button button-secondary" type="button">Limpiar búsqueda</button></div>`;
      this.querySelector('.empty-state button')?.addEventListener('click', () => {
        this.state = { query: '', group: 'all' };
        this.querySelector('input').value = '';
        this.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.toggle('is-active', chip.dataset.group === 'all'));
        this.renderProducts();
      });
    }
  }

  class ContactForm extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <form class="contact-form" novalidate>
          <div class="form-heading"><p class="eyebrow">Cuéntanos tu necesidad</p><h2>Preparemos tu cotización</h2><p>Completa los datos y continuaremos la conversación por WhatsApp.</p></div>
          <div class="field-grid">
            <label class="field"><span>Nombre <b aria-hidden="true">*</b></span><input name="name" autocomplete="name" required placeholder="Tu nombre"><small class="field-error" id="name-error"></small></label>
            <label class="field"><span>Correo <b aria-hidden="true">*</b></span><input name="email" type="email" autocomplete="email" required placeholder="nombre@empresa.com"><small class="field-error" id="email-error"></small></label>
          </div>
          <label class="field"><span>Empresa <em>opcional</em></span><input name="company" autocomplete="organization" placeholder="Nombre de tu empresa"></label>
          <label class="field"><span>¿Qué necesitas? <b aria-hidden="true">*</b></span><textarea name="message" rows="5" required placeholder="Producto, cantidad aproximada o tipo de riesgo que buscas atender"></textarea><small class="field-error" id="message-error"></small></label>
          <button class="button form-submit" type="submit">Enviar por WhatsApp <span aria-hidden="true"><i class="bi bi-arrow-up-right" aria-hidden="true"></i></span></button><p class="form-note">Al continuar se abrirá WhatsApp; no almacenamos tus datos en este sitio.</p>
        </form>`;
      const form = this.querySelector('form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form).entries());
        const result = utils.validateContact(values);
        form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });
        form.querySelectorAll('[aria-invalid]').forEach((element) => element.removeAttribute('aria-invalid'));
        if (!result.valid) {
          Object.entries(result.errors).forEach(([name, message]) => {
            const field = form.elements[name];
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', `${name}-error`);
            form.querySelector(`#${name}-error`).textContent = message;
          });
          form.elements[Object.keys(result.errors)[0]].focus();
          return;
        }
        const company = values.company ? `\nEmpresa: ${values.company}` : '';
        const message = `Hola Tulah, soy ${values.name}.${company}\nCorreo: ${values.email}\n\nSolicitud: ${values.message}`;
        window.open(utils.buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
      });
    }
  }

  customElements.define('site-navbar', SiteNavbar);
  customElements.define('site-footer', SiteFooter);
  customElements.define('whatsapp-float', WhatsAppFloat);
  customElements.define('product-catalog', ProductCatalog);
  customElements.define('contact-form', ContactForm);
})();
