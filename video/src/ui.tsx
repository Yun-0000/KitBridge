import type { CSSProperties, ReactNode } from "react";
import { Easing, Html5Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import boxesJson from "./boxes.json";

export const C = {
  ink: "#141414",
  paper: "#FAFAF7",
  yellow: "#FFC93C",
  muted: "#63615B",
  mutedDark: "#B9B7B0",
  line: "#E6E4DE",
  ink2: "#2C2B28",
};
export const DISPLAY = "'Bricolage Grotesque', sans-serif";
export const SANS = "'Schibsted Grotesk', sans-serif";

type Box = { x: number; y: number; width: number; height: number };
export const boxes = boxesJson as unknown as Record<string, Box>;
export const center = (name: string) => {
  const b = boxes[name];
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

const ease = Easing.bezier(0.45, 0, 0.2, 1);

/** Piecewise interpolation of numeric keyframes with a smooth ease between each. */
export function keyframes(frame: number, keys: { f: number; v: number }[]): number {
  if (frame <= keys[0].f) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i].f) {
      return interpolate(frame, [keys[i - 1].f, keys[i].f], [keys[i - 1].v, keys[i].v], {
        easing: ease,
      });
    }
  }
  return keys[keys.length - 1].v;
}

export function fadeIn(frame: number, start: number, length = 12) {
  return interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function rise(frame: number, start: number, distance = 24): CSSProperties {
  const p = fadeIn(frame, start, 14);
  return { opacity: p, transform: `translateY(${(1 - ease(p)) * distance}px)` };
}

export function usePop(start: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 140 } });
}

/* ---------- Browser window with a camera over a full-page screenshot ---------- */

const PAGE_W = 1440;
const VIEW_H = 900;

export type CameraKey = { f: number; x: number; y: number; z: number };
export type CursorKey = { f: number; x: number; y: number; click?: boolean };
export type Shot = { src: string; from: number };
export type Ring = { box: string; from: number; to?: number; pad?: number };

export function BrowserScreen({
  shots,
  camera,
  cursor = [],
  rings = [],
  width = 1440,
  url = "kitbridge-sigma.vercel.app",
}: {
  shots: Shot[];
  camera: CameraKey[];
  cursor?: CursorKey[];
  rings?: Ring[];
  width?: number;
  url?: string;
}) {
  const frame = useCurrentFrame();
  const k = width / PAGE_W;
  const vw = width;
  const vh = VIEW_H * k;
  const z = keyframes(frame, camera.map((c) => ({ f: c.f, v: c.z })));
  const pageH = Math.max(
    ...shots.map((s) => boxes[`page:${s.src}`]?.height ?? VIEW_H),
  );
  const halfW = vw / (2 * k * z);
  const halfH = vh / (2 * k * z);
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const cx = clamp(keyframes(frame, camera.map((c) => ({ f: c.f, v: c.x }))), halfW, PAGE_W - halfW);
  const cy = clamp(keyframes(frame, camera.map((c) => ({ f: c.f, v: c.y }))), halfH, pageH - halfH);
  const toView = (x: number, y: number) => ({
    x: (x - cx) * k * z + vw / 2,
    y: (y - cy) * k * z + vh / 2,
  });

  const cursorPos = cursor.length
    ? toView(
        keyframes(frame, cursor.map((c) => ({ f: c.f, v: c.x }))),
        keyframes(frame, cursor.map((c) => ({ f: c.f, v: c.y }))),
      )
    : null;
  const lastClick = [...cursor].reverse().find((c) => c.click && c.f <= frame);
  const clickAge = lastClick ? frame - lastClick.f : 99;

  return (
    <div
      style={{
        width: vw,
        borderRadius: 18,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 40px 90px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(20,20,20,0.08)",
      }}
    >
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 18px",
          background: "#EFEDE8",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        {["#E8E6E0", "#E8E6E0", "#E8E6E0"].map((c, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: "#D6D3CB" }} />
        ))}
        <span
          style={{
            margin: "0 auto",
            padding: "5px 18px",
            borderRadius: 8,
            background: "#fff",
            fontFamily: SANS,
            fontSize: 15,
            color: C.muted,
          }}
        >
          {url}
        </span>
        <span style={{ width: 52 }} />
      </div>
      <div style={{ position: "relative", width: vw, height: vh, overflow: "hidden", background: C.paper }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PAGE_W,
            transformOrigin: "0 0",
            transform: `translate(${vw / 2 - cx * k * z}px, ${vh / 2 - cy * k * z}px) scale(${k * z})`,
          }}
        >
          {shots.map((shot, i) => (
            <Img
              key={shot.src + i}
              src={staticFile(`shots/${shot.src}.png`)}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: PAGE_W,
                opacity: i === 0 ? 1 : fadeIn(frame, shot.from, 5),
              }}
            />
          ))}
          {rings.map((ring, i) => {
            const b = boxes[ring.box];
            const pad = ring.pad ?? 6;
            const o = Math.min(
              fadeIn(frame, ring.from, 8),
              ring.to ? 1 - fadeIn(frame, ring.to, 8) : 1,
            );
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: b.x - pad,
                  top: b.y - pad,
                  width: b.width + pad * 2,
                  height: b.height + pad * 2,
                  borderRadius: 10,
                  border: `3px solid ${C.yellow}`,
                  boxShadow: `0 0 0 6px rgba(255,201,60,0.28)`,
                  opacity: o,
                }}
              />
            );
          })}
        </div>
        {cursorPos ? <Cursor x={cursorPos.x} y={cursorPos.y} clickAge={clickAge} /> : null}
        {cursor.filter((c) => c.click).map((c) => (
          <Sfx key={c.f} name="click" at={c.f} volume={0.45} />
        ))}
      </div>
    </div>
  );
}

function Cursor({ x, y, clickAge }: { x: number; y: number; clickAge: number }) {
  const press = clickAge < 6 ? 0.85 : 1;
  const ripple = clickAge < 18 ? clickAge / 18 : null;
  return (
    <>
      {ripple !== null ? (
        <div
          style={{
            position: "absolute",
            left: x - 30 * ripple - 6,
            top: y - 30 * ripple - 6,
            width: 60 * ripple + 12,
            height: 60 * ripple + 12,
            borderRadius: 999,
            border: `3px solid ${C.yellow}`,
            opacity: 1 - ripple,
          }}
        />
      ) : null}
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x - 6,
          top: y - 3,
          transform: `scale(${press})`,
          transformOrigin: "6px 3px",
          filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))",
        }}
      >
        <path d="M5 3l14 8-6.2 1.6L10 19z" fill="#141414" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  );
}

/* ---------- Phone ---------- */

export function Phone({ src, scrollFrom, scrollTo, from, to }: {
  src: string;
  scrollFrom: number;
  scrollTo: number;
  from: number;
  to: number;
}) {
  const frame = useCurrentFrame();
  const scroll = keyframes(frame, [
    { f: from, v: scrollFrom },
    { f: to, v: scrollTo },
  ]);
  const scale = 0.94;
  return (
    <div
      style={{
        width: 390 * scale + 24,
        height: 844 * scale + 24,
        padding: 12,
        borderRadius: 56,
        background: C.ink,
        boxShadow: "0 40px 80px -30px rgba(0,0,0,0.6)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: 390 * scale, height: 844 * scale, borderRadius: 44, overflow: "hidden", background: C.paper, position: "relative" }}>
        <Img
          src={staticFile(`shots/${src}.png`)}
          style={{ width: 390 * scale, position: "absolute", top: -scroll * scale, left: 0 }}
        />
      </div>
    </div>
  );
}

/* ---------- Captions ---------- */

export function Caption({ words, spoken, opacity }: { words: string[]; spoken: number; opacity: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 22,
        display: "flex",
        justifyContent: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 1720,
          padding: "10px 24px",
          borderRadius: 14,
          background: "rgba(20,20,20,0.86)",
          color: "#fff",
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: 32,
          lineHeight: 1.28,
          textAlign: "center",
        }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ color: i < spoken ? "#fff" : "rgba(255,255,255,0.5)" }}>
            {i ? " " : ""}
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A sound effect from public/sfx, starting at a frame of the current sequence. */
export function Sfx({ name, at, volume = 0.5 }: { name: string; at: number; volume?: number }) {
  return (
    <Sequence from={at} durationInFrames={45} layout="none" name={`sfx:${name}`}>
      <Html5Audio src={staticFile(`sfx/${name}.mp3`)} volume={volume} />
    </Sequence>
  );
}

export function Stage({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden" }}>{children}</div>
  );
}

export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: C.yellow,
        display: "inline-grid",
        placeItems: "center",
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 12h4M3 3h18m0 4v13.4a.6.6 0 0 1-.6.6H3.6a.6.6 0 0 1-.6-.6V7" />
      </svg>
    </span>
  );
}
