export class StudioViewer {
  constructor(host) {
    this.host = host;
    this.frames = [];
    this.cache = new Map();
    this.index = 0;
    this.autoRotate = true;
    this.userInteracting = false;
    this.dragging = false;
    this.lastX = 0;
    this.acc = 0;
    this.scale = 1;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (this.reduced) this.autoRotate = false;

    host.innerHTML = "";
    this.stageEl = document.createElement("div");
    this.stageEl.className = "orbit-stage";
    this.img = document.createElement("img");
    this.img.alt = "球鞋实拍环视图。拖动旋转，也可用按钮或方向键。";
    this.img.setAttribute("role", "img");
    this.img.draggable = false;
    this.img.decoding = "async";
    this.status = document.createElement("p");
    this.status.className = "orbit-status";
    this.status.setAttribute("aria-live", "polite");
    this.status.textContent = "载入实拍…";
    this.stageEl.append(this.img, this.status);
    host.appendChild(this.stageEl);

    this.stageEl.tabIndex = 0;
    this.stageEl.setAttribute("role", "img");
    this.stageEl.setAttribute(
      "aria-label",
      "可交互的球鞋实拍环视。拖动旋转。也可用下方按钮或方向键。",
    );

    this.boundPointerDown = this.#onPointerDown.bind(this);
    this.boundPointerMove = this.#onPointerMove.bind(this);
    this.boundPointerUp = this.#onPointerUp.bind(this);
    this.boundKey = this.#onKey.bind(this);
    this.boundWheel = this.#onWheel.bind(this);
    this.stageEl.addEventListener("pointerdown", this.boundPointerDown);
    this.stageEl.addEventListener("pointermove", this.boundPointerMove);
    this.stageEl.addEventListener("pointerup", this.boundPointerUp);
    this.stageEl.addEventListener("pointercancel", this.boundPointerUp);
    this.stageEl.addEventListener("keydown", this.boundKey);
    this.stageEl.addEventListener("wheel", this.boundWheel, { passive: false });

    this.timer = window.setInterval(() => {
      if (this.autoRotate && !this.userInteracting && this.frames.length > 1) {
        this.nudge(1);
      }
    }, 90);
  }

  #onPointerDown(event) {
    this.dragging = true;
    this.userInteracting = true;
    this.lastX = event.clientX;
    this.acc = 0;
    this.stageEl.setPointerCapture(event.pointerId);
  }

  #onPointerMove(event) {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastX;
    this.lastX = event.clientX;
    const step = this.frames.length > 20 ? 10 : 28;
    this.acc += dx;
    while (this.acc <= -step) {
      this.nudge(1);
      this.acc += step;
    }
    while (this.acc >= step) {
      this.nudge(-1);
      this.acc -= step;
    }
  }

  #onPointerUp(event) {
    this.dragging = false;
    this.userInteracting = false;
    try {
      this.stageEl.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  #onWheel(event) {
    event.preventDefault();
    this.dolly(event.deltaY > 0 ? -0.08 : 0.08);
  }

  #onKey(event) {
    if (event.key === "ArrowLeft") {
      this.nudge(-1);
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      this.nudge(1);
      event.preventDefault();
    } else if (event.key === "ArrowUp" || event.key === "+" || event.key === "=") {
      this.dolly(0.12);
      event.preventDefault();
    } else if (event.key === "ArrowDown" || event.key === "-" || event.key === "_") {
      this.dolly(-0.12);
      event.preventDefault();
    } else if (event.key === " ") {
      this.setAutoRotate(!this.autoRotate);
      event.preventDefault();
    } else if (event.key === "0" || event.key === "Home") {
      this.resetView();
      event.preventDefault();
    }
  }

  nudge(delta) {
    if (!this.frames.length) return;
    const n = this.frames.length;
    this.index = (this.index + delta + n) % n;
    this.#paint();
  }

  dolly(delta) {
    this.scale = Math.min(1.55, Math.max(0.85, this.scale + delta));
    this.img.style.transform = `scale(${this.scale})`;
  }

  resetView() {
    this.index = 0;
    this.scale = 1;
    this.img.style.transform = "scale(1)";
    this.#paint();
  }

  setAutoRotate(on) {
    this.autoRotate = on && !this.reduced;
    return this.autoRotate;
  }

  resize() {
    /* photo stage is CSS-sized */
  }

  async setColorway(colorway, { instant = false, label = "" } = {}) {
    this.frames = colorway.frames || [];
    this.index = 0;
    this.scale = 1;
    this.img.style.transform = "scale(1)";
    this.img.alt = label || colorway.label || "球鞋实拍";
    this.status.hidden = false;
    this.status.textContent = "载入实拍…";
    if (!this.frames.length) {
      this.status.textContent = "没有可用的实拍图";
      return;
    }
    this.#paint();
    await this.#preload(this.frames);
    if (this.frames[this.index]) this.#paint();
    this.status.hidden = true;
    if (!instant && this.stageEl) {
      this.stageEl.dataset.ready = "true";
    }
  }

  #paint() {
    const src = this.frames[this.index];
    if (!src) return;
    if (this.img.src !== src) this.img.src = src;
  }

  #preload(urls) {
    const pending = urls.map((src) => {
      if (this.cache.has(src)) return this.cache.get(src);
      const promise = new Promise((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(src);
        image.onerror = () => resolve(src);
        image.src = src;
      });
      this.cache.set(src, promise);
      return promise;
    });
    return Promise.all(pending);
  }

  dispose() {
    window.clearInterval(this.timer);
    this.stageEl.removeEventListener("pointerdown", this.boundPointerDown);
    this.stageEl.removeEventListener("pointermove", this.boundPointerMove);
    this.stageEl.removeEventListener("pointerup", this.boundPointerUp);
    this.stageEl.removeEventListener("pointercancel", this.boundPointerUp);
    this.stageEl.removeEventListener("keydown", this.boundKey);
    this.stageEl.removeEventListener("wheel", this.boundWheel);
  }
}
