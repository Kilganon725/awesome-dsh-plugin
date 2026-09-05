import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildSneaker, disposeObject } from "./sneaker.js";

export class StudioViewer {
  constructor(host) {
    this.host = host;
    this.shoe = null;
    this.autoRotate = true;
    this.userInteracting = false;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (this.reduced) this.autoRotate = false;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    const width = host.clientWidth || 800;
    const height = host.clientHeight || 560;
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 40);
    this.camera.position.set(2.2, 1.7, 5.4);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.setAttribute(
      "aria-label",
      "可交互的球鞋三维展台。拖动旋转，滚轮缩放。也可用下方按钮或方向键环视。",
    );
    this.renderer.domElement.tabIndex = 0;
    host.appendChild(this.renderer.domElement);

    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(environment, 0.04).texture;
    environment.dispose();

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 9;
    this.controls.minPolarAngle = 0.75;
    this.controls.maxPolarAngle = 1.4;
    this.controls.target.set(0, 0.42, 0);
    this.controls.autoRotate = false;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };

    this.controls.addEventListener("start", () => {
      this.userInteracting = true;
    });
    this.controls.addEventListener("end", () => {
      this.userInteracting = false;
    });

    this.#lights();
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext("2d");
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 124);
    grad.addColorStop(0, "rgba(0,0,0,0.45)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.16)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 48),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.receiveShadow = true;
    this.scene.add(shadow);

    this.boundLoop = this.#loop.bind(this);
    this.boundResize = this.#resize.bind(this);
    this.boundKey = this.#onKey.bind(this);
    window.addEventListener("resize", this.boundResize);
    this.ro = new ResizeObserver(() => this.#resize());
    this.ro.observe(host);
    this.renderer.domElement.addEventListener("keydown", this.boundKey);
    document.addEventListener("visibilitychange", this.#onVisibility);
    this.raf = requestAnimationFrame(this.boundLoop);
  }

  #onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
    } else {
      this.clock.getDelta();
      this.raf = requestAnimationFrame(this.boundLoop);
    }
  };

  #lights() {
    const hemi = new THREE.HemisphereLight(0xf5f0e6, 0x1c1917, 0.55);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff6e8, 1.55);
    key.position.set(4.2, 6.2, 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 16;
    key.shadow.radius = 3;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xcfe8ff, 0.85);
    rim.position.set(-5.4, 2.2, -3.8);
    this.scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffe8c8, 0.38);
    fill.position.set(-2.2, 3.4, 4.6);
    this.scene.add(fill);

    const spot = new THREE.SpotLight(0xffe7b0, 8, 14, 0.38, 0.45, 1.2);
    spot.position.set(0.4, 6.4, 2.2);
    spot.target.position.set(0, 0.4, 0);
    this.scene.add(spot, spot.target);
  }

  resize() {
    this.#resize();
  }

  #resize() {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
  }

  #onKey(event) {
    const step = 0.12;
    if (event.key === "ArrowLeft") {
      this.nudge(-step, 0);
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      this.nudge(step, 0);
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      this.nudge(0, -step);
      event.preventDefault();
    } else if (event.key === "ArrowDown") {
      this.nudge(0, step);
      event.preventDefault();
    } else if (event.key === "+" || event.key === "=") {
      this.dolly(-0.28);
      event.preventDefault();
    } else if (event.key === "-" || event.key === "_") {
      this.dolly(0.28);
      event.preventDefault();
    } else if (event.key === " ") {
      this.setAutoRotate(!this.autoRotate);
      event.preventDefault();
    } else if (event.key === "0" || event.key === "Home") {
      this.resetView();
      event.preventDefault();
    }
  }

  nudge(az, pol) {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += az;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + pol, 0.55, 1.45);
    offset.setFromSpherical(spherical);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  dolly(delta) {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    const next = THREE.MathUtils.clamp(offset.length() + delta, this.controls.minDistance, this.controls.maxDistance);
    offset.setLength(next);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  resetView() {
    this.camera.position.set(2.2, 1.7, 5.4);
    this.controls.target.set(0, 0.42, 0);
    this.controls.update();
  }

  setAutoRotate(on) {
    this.autoRotate = on && !this.reduced;
    return this.autoRotate;
  }

  setModel(shoe, colorway, { instant = false } = {}) {
    const incoming = buildSneaker(shoe, colorway);
    incoming.scale.setScalar(instant ? 1 : 0.001);
    this.pivot.add(incoming);

    const previous = this.shoe;
    this.shoe = incoming;
    this.currentMeta = { shoe, colorway };

    return { previous, incoming };
  }

  clearPrevious(previous) {
    if (!previous) return;
    this.pivot.remove(previous);
    disposeObject(previous);
  }

  #loop() {
    this.raf = requestAnimationFrame(this.boundLoop);
    const dt = this.clock.getDelta();
    if (this.autoRotate && !this.userInteracting && this.shoe) {
      this.pivot.rotation.y += dt * 0.35;
    }
    if (this.shoe && !this.reduced) {
      const t = this.clock.elapsedTime;
      this.shoe.position.y = (this.shoe.userData.floatY || 0) + Math.sin(t * 1.1) * 0.028;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.boundResize);
    this.ro?.disconnect();
    this.renderer.domElement.removeEventListener("keydown", this.boundKey);
    document.removeEventListener("visibilitychange", this.#onVisibility);
    if (this.shoe) disposeObject(this.shoe);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
