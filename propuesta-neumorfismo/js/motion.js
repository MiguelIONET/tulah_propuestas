/* Progressive enhancement: content remains visible without animation support. */
(function () {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const running = new Set();
  const observer = new IntersectionObserver((entries) => {
    let order = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      entry.target.classList.add('is-revealed');
      if (preference.matches) return;
      const animation = entry.target.animate(
        [{ opacity: .4, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 650, delay: Math.min(order++ * 70, 210), easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
      running.add(animation);
      animation.finished.then(() => running.delete(animation), () => running.delete(animation));
    });
  }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
  document.querySelectorAll('[data-reveal], .service-card, .services-heading').forEach((element) => {
    // These receive a CSS entrance, so do not animate the same element twice.
    if (!element.closest('.page-hero')) observer.observe(element);
  });
  preference.addEventListener('change', () => {
    if (preference.matches) running.forEach(animation => animation.cancel());
  });
})();

