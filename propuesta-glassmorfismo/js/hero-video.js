(function () {
  class HeroVideo extends HTMLElement {
    connectedCallback() {
      if (this._events) return;
      const video = this.querySelector('video');
      const section = this.closest('.hero-film');
      const toggle = section.querySelector('.video-toggle');
      const status = section.querySelector('.video-status');
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const events = new AbortController();
      this._events = events;
      const options = { signal: events.signal };
      let wantsPlayback = !motion.matches && !navigator.connection?.saveData;
      let visible = true;
      let loaded = false;
      let failed = false;
      video.muted = true;
      video.autoplay = wantsPlayback;
      toggle.hidden = false;
      const updateButton = () => {
        toggle.innerHTML = video.paused
          ? '<i class="bi bi-play-fill" aria-hidden="true"></i><span>Reproducir video</span>'
          : '<i class="bi bi-pause-fill" aria-hidden="true"></i><span>Pausar video</span>';
        toggle.setAttribute('aria-label', video.paused ? 'Reproducir video de fondo' : 'Pausar video de fondo');
      };
      const sync = async () => {
        if (failed) return;
        if (!wantsPlayback || !visible || document.hidden) {
          video.pause();
          updateButton();
          return;
        }
        if (!loaded) {
          const source = video.querySelector('source');
          source.src = source.dataset.src;
          video.load();
          loaded = true;
        }
        try {
          await video.play();
          if (!wantsPlayback || !visible || document.hidden) video.pause();
        } catch (error) {
          // Autoplay can be declined by the browser; the button remains available.
          if (error.name !== 'AbortError') updateButton();
        }
      };
      video.addEventListener('playing', () => {
        this.classList.add('is-playing', 'has-played');
        updateButton();
      }, options);
      video.addEventListener('pause', () => {
        this.classList.remove('is-playing');
        updateButton();
      }, options);
      const showPoster = () => {
        failed = true;
        video.pause();
        this.classList.remove('is-playing', 'has-played');
        toggle.hidden = true;
        status.textContent = 'Vista previa del entorno industrial';
      };
      video.addEventListener('error', showPoster, options);
      video.querySelector('source').addEventListener('error', showPoster, options);
      toggle.addEventListener('click', () => {
        wantsPlayback = video.paused;
        sync();
      }, options);
      document.addEventListener('visibilitychange', sync, options);
      motion.addEventListener('change', () => {
        wantsPlayback = !motion.matches && !navigator.connection?.saveData;
        video.autoplay = wantsPlayback;
        sync();
      }, options);
      this._observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }, { threshold: 0.05 });
      this._observer.observe(section);
      updateButton();
      sync();
    }
    disconnectedCallback() {
      this._events?.abort();
      this._observer?.disconnect();
      this.querySelector('video')?.pause();
      this._events = null;
    }
  }
  customElements.define('hero-video', HeroVideo);
})();
