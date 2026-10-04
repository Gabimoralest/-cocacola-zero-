/* ==========================================================================
   COCA-COLA ZERO SUGAR · MOMENTOS SIN LÍMITES
   Lógica vanilla: header, menú móvil, scroll activo, reveal,
   videos por visibilidad (IntersectionObserver), botón Sonido y escenas.
   ========================================================================== */
(function () {
  "use strict";

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Compatibilidad: navegadores sin IntersectionObserver. Se usa un shim que
  // marca todo como visible/reproducible una sola vez, para que la página
  // funcione (menú, sonido, scroll) igualmente.
  if (!("IntersectionObserver" in window)) {
    window.IntersectionObserver = function (callback) {
      this.observe = (el) => callback([{ isIntersecting: true, target: el, intersectionRatio: 1 }]);
      this.unobserve = () => {};
      this.disconnect = () => {};
    };
  }

  /* ------------------------------------------------------------------
     1. HEADER — estado al hacer scroll
     ------------------------------------------------------------------ */
  const header = document.getElementById("header");
  const onScrollHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ------------------------------------------------------------------
     2. MENÚ MÓVIL
     ------------------------------------------------------------------ */
  const menuBtn = document.getElementById("menuBtn");
  const mobileNav = document.getElementById("mobileNav");

  function setMenu(open) {
    menuBtn.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    mobileNav.hidden = !open;
  }
  menuBtn.addEventListener("click", () => setMenu(mobileNav.hidden));
  mobileNav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => setMenu(false))
  );

  /* ------------------------------------------------------------------
     3. ENLACE ACTIVO EN LA NAVEGACIÓN (según sección visible)
     ------------------------------------------------------------------ */
  const navLinks = Array.from(document.querySelectorAll(".nav__link"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = "#" + entry.target.id;
        navLinks.forEach((l) =>
          l.classList.toggle("is-active", l.getAttribute("href") === id)
        );
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  sections.forEach((s) => navObserver.observe(s));

  /* ------------------------------------------------------------------
     4. REVEAL — animaciones de entrada suaves
     ------------------------------------------------------------------ */
  const revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px 20% 0px", threshold: 0.01 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ------------------------------------------------------------------
     5. PARALLAX LIGERO — solo fondos/medios, nunca texto/botones/header
     ------------------------------------------------------------------ */
  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  if (!reduceMotion && parallaxEls.length) {
    let ticking = false;
    const applyParallax = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // posición relativa respecto al centro del viewport (-1..1)
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        const speed = parseFloat(el.dataset.parallax) || 0.04;
        el.style.transform = `translate3d(0, ${(progress * speed * -100).toFixed(2)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(applyParallax);
        }
      },
      { passive: true }
    );
    applyParallax();
  }

  /* ------------------------------------------------------------------
     6 + 9. AUDIO DEL BOTÓN SONIDO — exclusivo Cocacola/audio1.mp4
     Independiente de los videos. Nunca dos audios a la vez.
     ------------------------------------------------------------------ */
  const soundAudio = document.getElementById("soundAudio");
  const soundBtn = document.getElementById("soundBtn");
  const soundLabel = soundBtn.querySelector(".sound-btn__label");

  let audioUnlocked = false;

  // Todos los videos de la página permanecen siempre en silencio.
  function muteAllVideos() {
    document.querySelectorAll("video").forEach((v) => {
      v.muted = true;
    });
  }

  function updateSoundBtn(playing) {
    soundBtn.classList.toggle("is-playing", playing);
    soundBtn.setAttribute("aria-pressed", String(playing));
    soundBtn.setAttribute("aria-label", playing ? "Pausar sonido" : "Reproducir sonido");
    soundLabel.textContent = playing ? "Sonando" : "Sonido";
  }

  soundBtn.addEventListener("click", () => {
    // Al activar el audio, se silencian los videos para que no compitan.
    if (!soundAudio.paused) {
      soundAudio.pause();
      updateSoundBtn(false);
      return;
    }

    // Mantiene los videos en silencio mientras suena el audio del botón.
    muteAllVideos();
    if (!audioUnlocked) {
      soundAudio.muted = false;
      soundAudio.volume = 1;
      audioUnlocked = true;
    }

    const playPromise = soundAudio.play();
    if (playPromise && playPromise.catch) {
      playPromise
        .then(() => updateSoundBtn(true))
        .catch(() => updateSoundBtn(false));
    } else {
      updateSoundBtn(true);
    }
  });

  // Al terminar, regresa a "Sonido".
  soundAudio.addEventListener("ended", () => updateSoundBtn(false));
  soundAudio.addEventListener("pause", () => updateSoundBtn(false));
  soundAudio.addEventListener("play", () => updateSoundBtn(true));

  /* ------------------------------------------------------------------
     7. VIDEOS POR VISIBILIDAD — solo el visible se reproduce
     ------------------------------------------------------------------ */
  const autoVideos = Array.from(document.querySelectorAll("video[data-autoplay]"));

  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          // Solo un video de sección reproduce a la vez.
          autoVideos.forEach((v) => {
            if (v !== video) v.pause();
          });
          video.muted = true; // siempre en silencio
          if (video.dataset.restart === "true") video.currentTime = 0;
          const p = video.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: [0, 0.35, 0.6] }
  );

  autoVideos.forEach((v) => {
    v.muted = true; // necesario para el autoplay
    videoObserver.observe(v);
  });

  /* ------------------------------------------------------------------
     8. EXPERIENCIA — video central + selector de momentos + sonido
     ------------------------------------------------------------------ */
  const sceneVideo = document.getElementById("sceneVideo");
  const sceneLabel = document.getElementById("sceneLabel");
  const player = document.getElementById("experiencePlayer");
  const pickerItems = Array.from(document.querySelectorAll(".picker-item"));

  // Cada momento usa recursos reales de la carpeta.
  const SCENES = {
    amigos: {
      label: "CON AMIGOS",
      src: "https://gabimoralest.github.io/-cocacola-zero-/Cocacola/partido.mp4",
      poster: "https://gabimoralest.github.io/-cocacola-zero-/Cocacola/amigos.png",
      transcript:
        "Amigos: ambiente de fútbol, risas, conversación, apertura de lata, efervescencia y hielo.",
    },
    familia: {
      label: "EN FAMILIA",
      src: "https://gabimoralest.github.io/-cocacola-zero-/Cocacola/cumpleaños.mp4",
      poster: "https://gabimoralest.github.io/-cocacola-zero-/Cocacola/familia.png",
      transcript:
        "Familia: conversación, cena, cubiertos, risas, apertura de lata, efervescencia y hielo.",
    },
    tipara: {
      label: "PARA TI",
      src: "https://gabimoralest.github.io/-cocacola-zero-/Cocacola/mar.mp4",
      poster: "https://gabimoralest.github.io/-cocacola-zero-/Cocacola/sola.png",
      transcript:
        "Para ti: olas, brisa, apertura de lata, efervescencia y ambiente relajante.",
    },
  };

  const transcript = document.getElementById("expTranscript");

  function setScene(name, { autoplay = false } = {}) {
    const scene = SCENES[name];
    if (!scene) return;

    pickerItems.forEach((item) => {
      const active = item.dataset.scene === name;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });

    sceneVideo.src = scene.src;
    sceneVideo.poster = scene.poster;
    sceneVideo.load();
    sceneLabel.textContent = scene.label;
    if (transcript) transcript.textContent = scene.transcript;

    // Reinicia el audio al cambiar de escena (nunca suena solo).
    stopExpAudio(false);

    player.classList.remove("is-switching");
    void player.offsetWidth; // reflow para reiniciar la animación
    player.classList.add("is-switching");

    if (autoplay) {
      const p = sceneVideo.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  // El video solo reproduce mientras está visible; se pausa al salir.
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const p = sceneVideo.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          sceneVideo.pause();
        }
      });
    },
    { threshold: 0.35 }
  );
  sceneObserver.observe(sceneVideo);

  // Navegación por teclado dentro del selector (flechas).
  pickerItems.forEach((item, i) => {
    item.addEventListener("click", () => setScene(item.dataset.scene, { autoplay: true }));
    item.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" &&
          e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 : -1;
      const next = pickerItems[(i + dir + pickerItems.length) % pickerItems.length];
      next.focus();
      setScene(next.dataset.scene, { autoplay: true });
    });
  });

  /* --- Sonido de la experiencia ---
     Usa la pista de audio ambiental del propio video central (partido,
     cena, mar). Nunca suena solo: se activa/pausa/desactiva a mano y es
     independiente del botón de sonido del header. */
  const expSound = document.getElementById("expSound");
  const expSoundLabel = document.getElementById("expSoundLabel");
  const expPause = document.getElementById("expPause");
  const expStop = document.getElementById("expStop");

  function updateExpSoundBtn(playing) {
    if (!expSound) return;
    expSound.classList.toggle("is-on", playing);
    expSound.setAttribute("aria-pressed", String(playing));
    if (expSoundLabel) expSoundLabel.textContent = playing ? "Sonando" : "Activar sonido";
  }

  function playExpAudio() {
    // Un solo audio a la vez: pausa el botón de sonido del header.
    if (soundAudio && !soundAudio.paused) soundAudio.pause();
    document.querySelectorAll("video").forEach((v) => {
      if (v !== sceneVideo) v.muted = true;
    });
    sceneVideo.muted = false;
    sceneVideo.volume = 1;
    const p = sceneVideo.play();
    if (p && p.then) {
      p.then(() => updateExpSoundBtn(true)).catch(() => {
        sceneVideo.muted = true;
        updateExpSoundBtn(false);
      });
    } else {
      updateExpSoundBtn(true);
    }
  }

  function stopExpAudio(update = true) {
    sceneVideo.muted = true;
    if (update) updateExpSoundBtn(false);
  }

  if (expSound) expSound.addEventListener("click", () => {
    if (sceneVideo.muted) playExpAudio();
    else { sceneVideo.muted = true; updateExpSoundBtn(false); }
  });
  if (expPause) expPause.addEventListener("click", () => {
    if (sceneVideo.muted) playExpAudio();
    else { sceneVideo.muted = true; updateExpSoundBtn(false); }
  });
  if (expStop) expStop.addEventListener("click", () => stopExpAudio(true));

  /* ------------------------------------------------------------------
     10. SMOOTH SCROLL con compensación del header fijo
     (refuerza scroll-behavior de CSS y cierra el menú en móvil)
     ------------------------------------------------------------------ */
  // Sin controles contextuales del navegador sobre los videos (menú/PiP).
  document.querySelectorAll(".product__video, .experience__video, .hero__video").forEach((v) => {
    v.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId === "#" || targetId.length < 2) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();

      const y =
        target.getBoundingClientRect().top +
        window.scrollY -
        header.offsetHeight;
      window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });
})();