const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function prefersReducedMotion() {
  return reduceMotion();
}

function splitChars(el) {
  if (!el) return [];
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  return [...text].map((ch) => {
    const span = document.createElement("span");
    span.className = "char";
    span.setAttribute("aria-hidden", "true");
    span.textContent = ch === " " ? "\u00A0" : ch;
    el.appendChild(span);
    return span;
  });
}

export function initMotion() {
  const reduced = reduceMotion();
  if (typeof gsap === "undefined") {
    return { reduced: true, mm: null, playIntro: () => {}, swapShoe: instantSwap };
  }
  gsap.registerPlugin(ScrollTrigger);

  const intro = document.querySelector("[data-intro]");
  const headline = document.querySelector("[data-split]");
  const chars = headline ? splitChars(headline) : [];

  const mm = gsap.matchMedia();

  if (reduced) {
    gsap.set("[data-intro]", { autoAlpha: 0, pointerEvents: "none" });
    gsap.set("[data-reveal], .char, [data-hero-copy] > *", { clearProps: "all", autoAlpha: 1, y: 0 });
    return { reduced: true, mm, playIntro: () => {}, swapShoe: instantSwap };
  }

  gsap.set("[data-reveal]:not(.collection-grid)", { autoAlpha: 0, y: 24 });
  gsap.set(".collection-grid > *", { autoAlpha: 0, y: 24 });
  gsap.set("[data-hero-copy] > *", { autoAlpha: 0, y: 20 });

  const playIntro = () => {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    if (chars.length) {
      tl.from(chars, {
        opacity: 0,
        y: 20,
        rotateX: -40,
        duration: 0.6,
        stagger: 0.015,
        ease: "expo.out",
      });
    }
    tl.to(intro?.querySelector("[data-intro-mark]"), { opacity: 1, y: 0, duration: 0.5 }, 0);
    tl.to(
      intro,
      {
        yPercent: -110,
        duration: 0.85,
        ease: "expo.inOut",
        delay: 0.35,
        onComplete: () => {
          if (intro) {
            intro.hidden = true;
            intro.style.pointerEvents = "none";
          }
        },
      },
      "+=0.15",
    );
    tl.add(heroIn, "-=0.35");
    return tl;
  };

  function heroIn() {
    const tl = gsap.timeline();
    tl.to("[data-hero-copy] > *", {
      autoAlpha: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: "expo.out",
    });
    tl.from(
      "[data-stage]",
      { autoAlpha: 0, scale: 0.96, duration: 0.8, ease: "expo.out" },
      0,
    );
    return tl;
  }

  mm.add("(min-width: 768px)", () => {
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      const targets = el.matches(".collection-grid") ? el.children : el;
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          stagger: el.matches(".collection-grid") ? 0.08 : 0,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        },
      );
    });

    const story = document.querySelector("[data-story]");
    if (story) {
      gsap.timeline({
        scrollTrigger: {
          trigger: story,
          start: "top top",
          end: "+=120%",
          scrub: 1,
          pin: true,
        },
      })
        .from("[data-story-line]", { opacity: 0, y: 40, stagger: 0.15 })
        .to("[data-story-wash]", { yPercent: -18 }, "<");
    }

    gsap.utils.toArray("[data-parallax]").forEach((layer, i) => {
      gsap.to(layer, {
        yPercent: (i + 1) * -8,
        ease: "none",
        scrollTrigger: { trigger: layer.parentElement, scrub: 0.5 },
      });
    });
  });

  mm.add("(max-width: 767px)", () => {
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      const targets = el.matches(".collection-grid") ? el.children : el;
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.35,
          ease: "power1.out",
          scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none reverse" },
        },
      );
    });
  });

  return { reduced: false, mm, playIntro, swapShoe };
}

function instantSwap({ previous, incoming }, viewer) {
  incoming.scale.setScalar(1);
  viewer.clearPrevious(previous);
}

export function swapShoe({ previous, incoming }, viewer, reduced) {
  if (reduced) {
    instantSwap({ previous, incoming }, viewer);
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "expo.inOut" } });
  if (previous) {
    tl.to(previous.rotation, { y: previous.rotation.y + Math.PI, duration: 0.45, ease: "power2.in" }, 0);
    tl.to(previous.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35, ease: "power2.in" }, 0);
  }
  tl.add(() => viewer.clearPrevious(previous));
  tl.fromTo(
    incoming.scale,
    { x: 0.001, y: 0.001, z: 0.001 },
    { x: 1, y: 1, z: 1, duration: 0.55, ease: "expo.out" },
    previous ? "-=0.05" : 0,
  );
  tl.fromTo(
    incoming.rotation,
    { y: incoming.rotation.y - Math.PI / 2 },
    { y: incoming.rotation.y, duration: 0.7, ease: "expo.out" },
    "<",
  );
  return tl;
}

export function bindMagnetic(el) {
  if (!el || reduceMotion() || window.matchMedia("(pointer: coarse)").matches) return () => {};
  const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - r.left - r.width / 2) * 0.3);
    yTo((e.clientY - r.top - r.height / 2) * 0.3);
  };
  const reset = () => {
    xTo(0);
    yTo(0);
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", reset);
  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", reset);
  };
}

export function flashAccent() {
  if (reduceMotion()) return;
  const wash = document.querySelector("[data-swap-flash]");
  if (!wash) return;
  gsap.fromTo(wash, { autoAlpha: 0.22 }, { autoAlpha: 0, duration: 0.6, ease: "power2.out" });
}
