(function () {
  function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function filterProducts(products, query, category) {
    const needle = normalizeText(query);
    return products.filter((product) => {
      const inCategory = !category || category === 'all' || product.group === category;
      const haystack = normalizeText([product.name, product.description, product.group, ...product.items].join(' '));
      return inCategory && (!needle || haystack.includes(needle));
    });
  }

  function buildWhatsAppUrl(message) {
    return `https://wa.me/528114744867?text=${encodeURIComponent(message)}`;
  }

  function validateContact(fields) {
    const errors = {};
    if (!String(fields.name || '').trim()) errors.name = 'Escribe tu nombre.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fields.email || '').trim())) errors.email = 'Escribe un correo válido.';
    if (!String(fields.message || '').trim()) errors.message = 'Cuéntanos qué necesitas.';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  window.TulahUtils = Object.freeze({ normalizeText, filterProducts, buildWhatsAppUrl, validateContact });
})();
