import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { pointer } from "@/lib/pointer";
type Star3DProps = {
  active?: number;
  size?: string;
  smallSize?: number;
  smallOffsetX?: number;
};
const EASE = "cubic-bezier(0.22,1,0.36,1)";
export default function Star3D({
  active = 0,
  size = "min(60vh,600px)",
  smallSize = 116,
  smallOffsetX = 0,
}: Star3DProps) {
  const markRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boostRef = useRef<{
    t: number;
    dir: number;
    fast: boolean;
  } | null>(null);
  const prevActive = useRef(active);
  const [noWebgl, setNoWebgl] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setNoWebgl(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.7;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 50);
    camera.position.set(0, 0, 2.15);
    const ec = document.createElement("canvas");
    ec.width = 2048;
    ec.height = 1024;
    const ex = ec.getContext("2d")!;
    ex.fillStyle = "#000";
    ex.fillRect(0, 0, 2048, 1024);
    const box = (x: number, y: number, rx: number, ry: number, color: string, alpha: number) => {
      ex.save();
      ex.translate(x, y);
      ex.scale(rx, ry);
      const g = ex.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(0.55, `rgba(${color},${alpha * 0.7})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ex.fillStyle = g;
      ex.beginPath();
      ex.arc(0, 0, 1, 0, Math.PI * 2);
      ex.fill();
      ex.restore();
    };
    const tube = (x: number, y: number, w: number, h: number, alpha: number) => {
      const g = ex.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ex.fillStyle = g;
      ex.fillRect(x, y, w, h);
    };
    box(560, 470, 430, 330, "255,255,255", 1);
    box(1520, 460, 300, 280, "255,255,255", 0.55);
    box(1000, 110, 850, 190, "255,255,255", 0.3);
    box(940, 900, 680, 190, "255,255,255", 0.16);
    box(90, 600, 190, 210, "200,206,220", 0.16);
    box(1240, 700, 210, 190, "180,190,205", 0.1);
    tube(300, 150, 34, 740, 0.95);
    tube(1180, 210, 26, 620, 0.8);
    tube(1830, 300, 20, 460, 0.6);
    ex.fillStyle = "rgba(255,255,255,0.65)";
    ex.fillRect(0, 396, 2048, 14);
    ex.fillStyle = "rgba(255,255,255,0.95)";
    ex.fillRect(380, 452, 560, 44);
    const envTex = new THREE.CanvasTexture(ec);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(envTex).texture;
    pmrem.dispose();
    envTex.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x05050a, 0.16));
    const key = new THREE.DirectionalLight(0xffffff, 3.4);
    key.position.set(4, 6, 5);
    const kicker = new THREE.DirectionalLight(0xffffff, 1.1);
    kicker.position.set(-1, 7, -1.5);
    const rim = new THREE.DirectionalLight(0xdfe6ff, 1.5);
    rim.position.set(-5, 1.5, -4);
    const fill = new THREE.DirectionalLight(0xc9d2e3, 0.3);
    fill.position.set(-4, -1, 3);
    scene.add(key, kicker, rim, fill);
    const createStarShape = (outer: number, inner: number, points: number) => {
      const shape = new THREE.Shape();
      const step = (Math.PI * 2) / points;
      for (let i = 0; i < points; i++) {
        const tip = i * step - Math.PI / 2;
        const nextTip = tip + step;
        const valley = tip + step / 2;
        const b1 = tip + step / 4;
        const b2 = tip + (3 * step) / 4;
        const cr = 0.26 * outer;
        if (i === 0) shape.moveTo(Math.cos(tip) * outer, Math.sin(tip) * outer);
        shape.quadraticCurveTo(
          Math.cos(b1) * cr,
          Math.sin(b1) * cr,
          Math.cos(valley) * inner,
          Math.sin(valley) * inner,
        );
        shape.quadraticCurveTo(
          Math.cos(b2) * cr,
          Math.sin(b2) * cr,
          Math.cos(nextTip) * outer,
          Math.sin(nextTip) * outer,
        );
      }
      shape.closePath();
      return shape;
    };
    const chrome = new THREE.MeshPhysicalMaterial({
      name: "chrome",
      color: 0xf4f4f8,
      metalness: 1,
      roughness: 0.028,
      clearcoat: 1,
      clearcoatRoughness: 0.015,
      envMapIntensity: 5,
    });
    const starGeo = new THREE.ExtrudeGeometry(createStarShape(0.5, 0.095, 4), {
      depth: 0.0025,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.008,
      bevelSegments: 10,
      curveSegments: 96,
    });
    starGeo.center();
    starGeo.computeVertexNormals();
    const star = new THREE.Mesh(starGeo, chrome);
    star.name = "star";
    const ringGeo = new THREE.TorusGeometry(0.42, 0.013, 28, 320);
    const ring = new THREE.Mesh(ringGeo, chrome);
    ring.name = "orbit_ring";
    ring.rotation.x = 1.25;
    const orbit = new THREE.Group();
    orbit.rotation.z = Math.PI / 4;
    orbit.add(ring);
    const precess = new THREE.Group();
    precess.add(orbit);
    const emblem = new THREE.Group();
    emblem.add(star, precess);
    const pivot = new THREE.Group();
    pivot.add(emblem);
    scene.add(pivot);
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      camera.aspect = (r.width || 1) / (r.height || 1);
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    let dragId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let yaw = 0;
    let pitch = 0.12;
    let lookX = 0;
    let lookY = 0;
    const endDrag = () => {
      if (dragId === null) return;
      if (canvas.hasPointerCapture(dragId)) canvas.releasePointerCapture(dragId);
      dragId = null;
    };
    const onDown = (e: PointerEvent) => {
      if (dragId !== null) return;
      dragId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (dragId !== e.pointerId) return;
      if (e.pointerType === "mouse" && e.buttons === 0) return endDrag();
      yaw += (e.clientX - lastX) * 0.008;
      pitch += (e.clientY - lastY) * 0.006;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("blur", endDrag);
    const t0 = performance.now();
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const t = (now - t0) / 1000;
      const e = easeOut(Math.min(t / 1.2, 1));
      const b = boostRef.current;
      const extra = b
        ? b.dir * Math.PI * 2 * easeOut(Math.min((now - b.t) / (b.fast ? 1100 : 2000), 1))
        : 0;
      pivot.scale.setScalar(0.82 + 0.18 * e);
      pivot.position.y = (1 - e) * -0.06 + Math.sin(t * 0.7) * 0.012;
      const spin = t * 0.35 + Math.sin(t * 0.55) * 0.07;
      star.rotation.y = -1.9 * (1 - e) + spin + extra;
      precess.rotation.y = spin * 0.55 + extra * 0.6;
      emblem.rotation.z = Math.sin(t * 0.31) * 0.035;
      const box = canvas.getBoundingClientRect();
      const aimY =
        pointer.active && dragId === null
          ? Math.max(
              -1,
              Math.min(1, (pointer.sx - (box.left + box.width / 2)) / (window.innerWidth / 2)),
            )
          : 0;
      const aimX =
        pointer.active && dragId === null
          ? Math.max(
              -1,
              Math.min(1, (pointer.sy - (box.top + box.height / 2)) / (window.innerHeight / 2)),
            )
          : 0;
      lookY += (aimY * 0.45 - lookY) * 0.05;
      lookX += (aimX * 0.3 - lookX) * 0.05;
      pivot.rotation.y = yaw + lookY;
      pivot.rotation.x = pitch + lookX;
      renderer.render(scene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("blur", endDrag);
      starGeo.dispose();
      ringGeo.dispose();
      chrome.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    };
  }, []);
  useEffect(() => {
    const mark = markRef.current;
    const glow = glowRef.current;
    if (!mark || !glow) return;
    if (active !== prevActive.current) {
      boostRef.current = {
        t: performance.now(),
        dir: active > prevActive.current ? 1 : -1,
        fast: prevActive.current === 0 || active === 0,
      };
      prevActive.current = active;
    }
    const apply = () => {
      const box = mark.offsetHeight || 1;
      if (active === 0) {
        mark.style.transform = "translate(-50%,calc(-50% - 82px))";
        glow.style.opacity = "1";
      } else {
        const y = Math.round(74 - window.innerHeight / 2);
        mark.style.transform = `translate(calc(-50% + ${smallOffsetX}px),calc(-50% + ${y}px)) scale(${smallSize / box})`;
        glow.style.opacity = "0";
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [active, smallSize, smallOffsetX]);
  return (
    <div
      ref={markRef}
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        zIndex: 30,
        width: size,
        height: size,
        transform: "translate(-50%,calc(-50% - 82px))",
        transformOrigin: "50% 50%",
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        transition: `transform 1100ms ${EASE}`,
      }}
    >
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          width: "70%",
          height: "70%",
          borderRadius: 9999,
          background: noWebgl ? "rgba(190,196,210,0.22)" : "rgba(190,196,210,0.12)",
          filter: "blur(70px)",
          transition: "opacity 600ms",
        }}
        className="animate-pulse"
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: noWebgl ? "none" : "block",
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}
