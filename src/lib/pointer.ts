type PointerState = {
  x: number;
  y: number;
  sx: number;
  sy: number;
  active: boolean;
  fine: boolean;
  movedAt: number;
};

export const pointer: PointerState = {
  x: -9999,
  y: -9999,
  sx: -9999,
  sy: -9999,
  active: false,
  fine: false,
  movedAt: 0,
};

let tracking = false;

export function trackPointer() {
  if (tracking || typeof window === "undefined") return;
  tracking = true;
  pointer.fine = window.matchMedia("(pointer: fine)").matches;

  const onMove = (e: PointerEvent) => {
    if (!pointer.active) {
      pointer.sx = e.clientX;
      pointer.sy = e.clientY;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    pointer.movedAt = performance.now();
  };

  const onLeave = () => {
    pointer.active = false;
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerType === "touch") pointer.active = false;
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);
}
