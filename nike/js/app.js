import { SHOES } from "./catalog.js";
import { StudioViewer } from "./viewer.js";
import { initMotion, swapShoe, bindMagnetic, flashAccent } from "./motion.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  shoeIndex: 0,
  colorIndex: 0,
};

function currentShoe() {
  return SHOES[state.shoeIndex];
}

function currentColorway() {
  return currentShoe().colorways[state.colorIndex];
}

function renderMeta() {
  const shoe = currentShoe();
  const color = currentColorway();
  $("#shoe-name").textContent = shoe.name;
  $("#shoe-colorway").textContent = color.label;
  $("#shoe-year").textContent = shoe.year;
  $("#shoe-price").textContent = shoe.price;
  $("#shoe-category").textContent = shoe.category;
  $("#shoe-blurb").textContent = shoe.blurb;
  const facts = $("#shoe-facts");
  facts.replaceChildren(
    ...shoe.facts.map((fact) => {
      const li = document.createElement("li");
      li.textContent = fact;
      return li;
    }),
  );
  const live = $("#live");
  live.textContent = `已选择 ${shoe.name} ${color.label}`;

  $$("[data-shoe-card]").forEach((card) => {
    const active = card.dataset.shoeId === shoe.id;
    card.setAttribute("aria-pressed", String(active));
    card.classList.toggle("is-active", active);
  });

  renderColorways();
}

function renderColorways() {
  const shoe = currentShoe();
  const host = $("#colorways");
  host.replaceChildren(
    ...shoe.colorways.map((cw, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch";
      btn.style.setProperty("--swatch", cw.swatch);
      btn.setAttribute("aria-pressed", String(index === state.colorIndex));
      btn.setAttribute("aria-label", `${cw.label} 配色`);
      btn.title = cw.label;
      btn.addEventListener("click", () => selectColor(index));
      return btn;
    }),
  );
}

function renderCollection() {
  const host = $("#collection-grid");
  host.replaceChildren(
    ...SHOES.map((shoe, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "shoe-card";
      card.dataset.shoeCard = "";
      card.dataset.shoeId = shoe.id;
      card.setAttribute("aria-pressed", String(index === state.shoeIndex));
      card.innerHTML = `
        <span class="shoe-card__swatch" aria-hidden="true" style="--swatch:${shoe.colorways[0].swatch}"></span>
        <span class="shoe-card__meta">
          <span class="shoe-card__name">${shoe.name}</span>
          <span class="shoe-card__sub">${shoe.colorway} · ${shoe.year}</span>
        </span>
        <span class="shoe-card__cat">${shoe.category}</span>
      `;
      card.addEventListener("click", () => selectShoe(index));
      return card;
    }),
  );
}

function renderDots() {
  const host = $("#dots");
  host.replaceChildren(
    ...SHOES.map((shoe, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dot";
      btn.setAttribute("aria-label", `查看 ${shoe.name}`);
      btn.setAttribute("aria-current", String(index === state.shoeIndex));
      btn.addEventListener("click", () => selectShoe(index));
      return btn;
    }),
  );
}

function applyModel(viewer, motion, { instant = false } = {}) {
  const result = viewer.setModel(currentShoe(), currentColorway(), { instant });
  if (instant) {
    result.incoming.scale.setScalar(1);
    viewer.clearPrevious(result.previous);
  } else {
    swapShoe(result, viewer, motion.reduced);
    flashAccent();
  }
  renderMeta();
  renderDots();
}

function selectShoe(index) {
  if (index === state.shoeIndex) return;
  state.shoeIndex = index;
  state.colorIndex = 0;
  applyModel(window.__viewer, window.__motion);
}

function selectColor(index) {
  if (index === state.colorIndex) return;
  state.colorIndex = index;
  applyModel(window.__viewer, window.__motion);
}

function stepShoe(delta) {
  const next = (state.shoeIndex + delta + SHOES.length) % SHOES.length;
  selectShoe(next);
}

function bindControls(viewer) {
  $("#btn-prev").addEventListener("click", () => stepShoe(-1));
  $("#btn-next").addEventListener("click", () => stepShoe(1));
  $("#btn-left").addEventListener("click", () => viewer.nudge(-0.28, 0));
  $("#btn-right").addEventListener("click", () => viewer.nudge(0.28, 0));
  $("#btn-up").addEventListener("click", () => viewer.nudge(0, -0.16));
  $("#btn-down").addEventListener("click", () => viewer.nudge(0, 0.16));
  $("#btn-reset").addEventListener("click", () => viewer.resetView());
  const spin = $("#btn-spin");
  spin.setAttribute("aria-pressed", String(viewer.autoRotate));
  spin.addEventListener("click", () => {
    const on = viewer.setAutoRotate(!viewer.autoRotate);
    spin.setAttribute("aria-pressed", String(on));
    spin.querySelector("[data-spin-label]").textContent = on ? "暂停旋转" : "自动旋转";
  });

  $("#theme-toggle").addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    $("#theme-toggle").setAttribute("aria-pressed", String(next === "light"));
    localStorage.setItem("nike-studio-theme", next);
  });

  $("#menu-toggle").addEventListener("click", () => {
    const nav = $("#mobile-nav");
    const open = nav.hasAttribute("hidden");
    nav.toggleAttribute("hidden", !open);
    $("#menu-toggle").setAttribute("aria-expanded", String(open));
  });

  $$("#mobile-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      $("#mobile-nav").hidden = true;
      $("#menu-toggle").setAttribute("aria-expanded", "false");
    });
  });

  $("[data-enter]")?.addEventListener("click", () => {
    const intro = $("[data-intro]");
    if (!intro || intro.hidden) return;
    if (typeof gsap === "undefined" || motion.reduced) {
      intro.hidden = true;
      intro.style.pointerEvents = "none";
      return;
    }
    gsap.killTweensOf(intro);
    gsap.to(intro, {
      yPercent: -110,
      duration: 0.55,
      ease: "expo.inOut",
      onComplete: () => {
        intro.hidden = true;
        intro.style.pointerEvents = "none";
      },
    });
  });
}

function restoreTheme() {
  const saved = localStorage.getItem("nike-studio-theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = saved || (prefersLight ? "light" : "dark");
  document.documentElement.dataset.theme = theme;
  $("#theme-toggle").setAttribute("aria-pressed", String(theme === "light"));
}

function yearStamp() {
  const el = $("#year");
  if (el) el.textContent = String(new Date().getFullYear());
}

function start() {
  restoreTheme();
  yearStamp();
  renderCollection();
  renderDots();

  const stage = $("#stage");
  const viewer = new StudioViewer(stage);
  const motion = initMotion();
  window.__viewer = viewer;
  window.__motion = motion;

  applyModel(viewer, motion, { instant: true });
  bindControls(viewer);
  bindMagnetic($("[data-magnetic]"));

  if (!motion.reduced) {
    motion.playIntro();
  } else {
    const intro = $("[data-intro]");
    if (intro) intro.hidden = true;
  }

  if (!window.WebGLRenderingContext) {
    stage.innerHTML = "<p class='fallback'>当前浏览器无法显示 3D 展台，请换用支持 WebGL 的浏览器。</p>";
  }
}

start();
