import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { at, scenes } from "./timeline";
import {
  BrandMark,
  BrowserScreen,
  C,
  DISPLAY,
  Phone,
  SANS,
  Sfx,
  Stage,
  boxes,
  center,
  fadeIn,
  rise,
  usePop,
} from "./ui";

const TOP = { x: 720, y: 450, z: 1 };

function Centered({ children, top = 70 }: { children: React.ReactNode; top?: number }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center" }}>
      {children}
    </div>
  );
}

/* 1 ─ The problem */
export function Hook() {
  const frame = useCurrentFrame();
  const supplies = [
    ["Backpacks", 12],
    ["Notebooks", 12],
    ["Pencils", 40],
    ["Crayon boxes", 8],
    ["Calculators", 4],
  ] as const;
  const groups = [
    { name: "Lower grade", needs: "Crayons + notebook", at: at("L02", 0) },
    { name: "Upper grade", needs: "Calculator + 2 notebooks", at: at("L02", 0.2) },
  ];
  const promise = at("L02", 0.62);
  const second = at("L01", 0.48);
  return (
    <Stage bg={C.ink}>
      <div style={{ position: "absolute", left: 140, top: 230, color: "#fff" }}>
        <div style={{ ...rise(frame, 6), fontFamily: DISPLAY, fontSize: 104, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1 }}>
          Plenty of donations.
        </div>
        <div style={{ ...rise(frame, second), fontFamily: DISPLAY, fontSize: 104, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1, color: C.yellow, marginTop: 14 }}>
          Not enough complete kits.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 56, flexWrap: "wrap", maxWidth: 1500 }}>
          {supplies.map(([name, n], i) => (
            <div
              key={name}
              style={{
                ...rise(frame, 16 + i * 5, 30),
                padding: "14px 22px",
                borderRadius: 999,
                border: "1.5px solid #3A3936",
                fontFamily: SANS,
                fontSize: 30,
                color: "#E4E2DC",
              }}
            >
              <b style={{ color: "#fff", fontWeight: 600 }}>{n}</b> {name}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 44 }}>
          {groups.map((g) => (
            <div
              key={g.name}
              style={{
                ...rise(frame, g.at, 30),
                width: 420,
                padding: "24px 28px",
                borderRadius: 22,
                background: "#1F1E1C",
                border: "1px solid #2F2E2B",
                fontFamily: SANS,
              }}
            >
              <div style={{ fontSize: 22, color: C.mutedDark }}>{g.name}</div>
              <div style={{ fontSize: 32, color: "#fff", fontWeight: 600, marginTop: 4 }}>{g.needs}</div>
            </div>
          ))}
          <div
            style={{
              ...rise(frame, promise, 30),
              alignSelf: "center",
              padding: "16px 26px",
              borderRadius: 999,
              background: C.yellow,
              color: C.ink,
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 28,
            }}
          >
            4 kits already promised to each
          </div>
        </div>
      </div>
    </Stage>
  );
}

/* 2 ─ What KitBridge answers */
export function Intro() {
  const frame = useCurrentFrame();
  const pop = usePop(2);
  return (
    <Stage bg={C.paper}>
      <div style={{ position: "absolute", left: 160, top: 280 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, transform: `scale(${0.9 + pop * 0.1})`, opacity: pop, transformOrigin: "0 50%" }}>
          <BrandMark size={96} />
          <span style={{ fontFamily: DISPLAY, fontSize: 120, fontWeight: 700, letterSpacing: "-0.05em", color: C.ink }}>
            KitBridge
          </span>
        </div>
        <div style={{ marginTop: 70, display: "grid", gap: 26 }}>
          {[
            { n: "1", q: "How many complete kits can we pack right now?", t: at("L03", 0.42) },
            { n: "2", q: "What should we buy next?", t: at("L03", 0.8) },
          ].map(({ n, q, t }) => (
            <div key={n} style={{ ...rise(frame, t), display: "flex", alignItems: "center", gap: 26 }}>
              <span
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: C.ink,
                  color: C.yellow,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: DISPLAY,
                  fontSize: 34,
                  fontWeight: 700,
                }}
              >
                {n}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 52, fontWeight: 500, color: C.ink, letterSpacing: "-0.02em" }}>{q}</span>
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/* 3 ─ The answer band and the drive sheet */
export function Plan() {
  const sheet = { x: 720, y: 640, z: 1.08 };
  const nums = center("numbers");
  const mark = center("mark");
  const row = { x: 680, y: 640, z: 1.35 };
  return (
    <Stage bg={C.paper}>
      <Centered top={26}>
        <BrowserScreen
          shots={[{ src: "plan", from: 0 }]}
          camera={[
            { f: 0, ...TOP },
            { f: at("L04", 0.1), ...TOP },
            { f: at("L04", 0.35), ...sheet },
            { f: at("L05", 0.05), ...sheet },
            { f: at("L05", 0.3), x: nums.x - 120, y: nums.y + 40, z: 1.7 },
            { f: at("L06", 0.05), x: nums.x - 120, y: nums.y + 40, z: 1.7 },
            { f: at("L06", 0.22), x: mark.x - 160, y: mark.y, z: 1.75 },
            { f: at("L06", 0.55), x: mark.x - 160, y: mark.y, z: 1.75 },
            { f: at("L06", 0.8), ...row },
          ]}
          rings={[
            { box: "notebookTag", from: at("L06", 0.25), pad: 5 },
            { box: "mark", from: at("L06", 0.62), pad: 5 },
            { box: "buyChip", from: at("L06", 0.85), pad: 6 },
          ]}
        />
      </Centered>
    </Stage>
  );
}

/* 4 ─ Live edit: the budget */
export function Budget() {
  const budget = center("budget");
  const click = at("L07", 0.55);
  const typed = at("L07", 0.78);
  const solved = typed + 10;
  const sentence = center("sentence");
  return (
    <Stage bg={C.paper}>
      <Centered top={26}>
        <BrowserScreen
          shots={[
            { src: "plan-back", from: 0 },
            { src: "budget-focus", from: click },
            { src: "budget-typing", from: typed },
            { src: "budget-4", from: solved },
          ]}
          camera={[
            { f: 0, x: 900, y: 300, z: 1.25 },
            { f: at("L08", 0.05), x: 900, y: 300, z: 1.25 },
            { f: at("L08", 0.3), x: sentence.x + 80, y: sentence.y - 40, z: 1.55 },
          ]}
          cursor={[
            { f: 0, x: 980, y: 700 },
            { f: click - 4, x: budget.x + 10, y: budget.y },
            { f: click, x: budget.x + 10, y: budget.y, click: true },
            { f: at("L08", 0.2), x: budget.x + 10, y: budget.y },
            { f: at("L08", 0.4), x: 1250, y: 600 },
          ]}
          rings={[{ box: "budget", from: click, to: at("L08", 0.25), pad: 6 }]}
        />
      </Centered>
      <Sfx name="type" at={click + 6} volume={0.8} />
    </Stage>
  );
}

/* 5 ─ Promises are hard limits */
export function PromiseScene() {
  const field = center("backpack");
  const click = at("L09", 0.35);
  const typed = at("L09", 0.55);
  return (
    <Stage bg={C.paper}>
      <Centered top={26}>
        <BrowserScreen
          shots={[
            { src: "plan-back", from: 0 },
            { src: "backpack-focus", from: click },
            { src: "backpack-typing", from: typed },
            { src: "backpack-7", from: typed + 10 },
          ]}
          camera={[
            { f: 0, x: 600, y: 420, z: 1.2 },
            { f: at("L09", 0.7), x: 600, y: 420, z: 1.2 },
            { f: at("L10", 0.0), x: 520, y: 200, z: 1.6 },
          ]}
          cursor={[
            { f: 0, x: 900, y: 760 },
            { f: click - 4, x: field.x + 14, y: field.y },
            { f: click, x: field.x + 14, y: field.y, click: true },
            { f: at("L09", 0.75), x: field.x + 14, y: field.y },
            { f: at("L10", 0.2), x: 640, y: 700 },
          ]}
          rings={[{ box: "backpack", from: click, to: at("L10", 0.4), pad: 6 }]}
        />
      </Centered>
      <Sfx name="type" at={click + 6} volume={0.8} />
    </Stage>
  );
}

/* 6 ─ Packing sheets */
export function Packing() {
  const frame = useCurrentFrame();
  const open = center("openPacking");
  const tab = center("afterTab");
  const clickOpen = at("L11", 0.28);
  const clickTab = at("L11", 0.7);
  const checks = [1, 2, 3].map((i) => ({ c: center(`check${i}`), f: at("L12", 0.15 + i * 0.14) }));
  const printIn = at("L12", 0.78);
  const card = boxes.firstCard;
  const paper = fadeIn(frame, printIn, 14);
  return (
    <Stage bg={C.paper}>
      <Centered top={26}>
        <BrowserScreen
          shots={[
            { src: "plan-back", from: 0 },
            { src: "pack-now", from: clickOpen + 3 },
            { src: "pack-after", from: clickTab + 3 },
            ...checks.map((c, i) => ({ src: `pack-check-${i + 1}`, from: c.f + 2 })),
          ]}
          camera={[
            { f: 0, ...TOP },
            { f: clickTab + 8, ...TOP },
            { f: at("L12", 0.1), x: card.x + card.width / 2 + 120, y: card.y + 150, z: 1.45 },
          ]}
          cursor={[
            { f: 0, x: 700, y: 520 },
            { f: clickOpen - 4, x: open.x, y: open.y },
            { f: clickOpen, x: open.x, y: open.y, click: true },
            { f: clickTab - 5, x: tab.x, y: tab.y },
            { f: clickTab, x: tab.x, y: tab.y, click: true },
            ...checks.flatMap(({ c, f }) => [
              { f: f - 5, x: c.x, y: c.y },
              { f, x: c.x, y: c.y, click: true },
            ]),
          ]}
          rings={[{ box: "buyFirst", from: clickTab + 6, to: at("L12", 0.05), pad: 4 }]}
        />
      </Centered>
      <div
        style={{
          position: "absolute",
          right: 90,
          bottom: 60,
          width: 520,
          padding: 14,
          background: "#fff",
          borderRadius: 6,
          boxShadow: "0 30px 70px -20px rgba(0,0,0,0.45)",
          opacity: paper,
          transform: `translateY(${(1 - paper) * 80}px) rotate(${-3 + paper * 1}deg)`,
        }}
      >
        <Img src={staticFile("shots/print.png")} style={{ width: "100%", display: "block" }} />
      </div>
    </Stage>
  );
}

/* 7 ─ On a phone */
export function PhoneScene() {
  const frame = useCurrentFrame();
  const dur = scenes.phone.dur;
  return (
    <Stage bg={C.ink}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
        <div style={{ ...rise(frame, 0, 40) }}>
          <Phone src="phone-plan" scrollFrom={0} scrollTo={0} from={0} to={dur} />
        </div>
        <div style={{ ...rise(frame, 8, 40) }}>
          <Phone src="phone-restock" scrollFrom={260} scrollTo={560} from={10} to={dur - 10} />
        </div>
      </div>
    </Stage>
  );
}

/* 8 ─ How it works */
export function How() {
  const frame = useCurrentFrame();
  const steps = [
    { k: "Inputs", t: "Stock · recipes · promises · budget", at: at("L15", 0) },
    { k: "Step 1", t: "Maximize complete kits", at: at("L15", 0.08) },
    { k: "Step 2", t: "Minimize the purchase cost", at: at("L15", 0.55) },
    { k: "Output", t: "Packing sheets + shopping list", at: at("L15", 0.9) },
  ];
  const chips = ["HiGHS solver", "WebAssembly", "Web Worker", "React + TypeScript"];
  const proof = [
    { n: "¢", t: "Money in whole cents", at: at("L16", 0.05) },
    { n: "96", t: "brute-force checks", at: at("L16", 0.32) },
    { n: "0", t: "servers — stays on device", at: at("L16", 0.72) },
  ];
  return (
    <Stage bg={C.paper}>
      <div style={{ position: "absolute", left: 140, right: 140, top: 190 }}>
        <div style={{ ...rise(frame, 4), fontFamily: DISPLAY, fontSize: 76, fontWeight: 700, letterSpacing: "-0.045em", color: C.ink }}>
          A two-step integer program
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          {chips.map((c, i) => (
            <span
              key={c}
              style={{
                ...rise(frame, at("L14", 0.45) + i * 5, 14),
                padding: "10px 18px",
                borderRadius: 999,
                border: `1.5px solid ${C.line}`,
                background: "#fff",
                fontFamily: SANS,
                fontSize: 24,
                fontWeight: 500,
                color: C.ink,
              }}
            >
              {c}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 18, marginTop: 64 }}>
          {steps.map((s, i) => (
            <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 18, flex: 1 }}>
              <div
                style={{
                  ...rise(frame, s.at, 24),
                  flex: 1,
                  height: 170,
                  boxSizing: "border-box",
                  padding: "24px 26px",
                  borderRadius: 22,
                  background: i === 1 || i === 2 ? C.ink : "#fff",
                  color: i === 1 || i === 2 ? "#fff" : C.ink,
                  border: i === 1 || i === 2 ? "none" : `1.5px solid ${C.line}`,
                  fontFamily: SANS,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 600, color: i === 1 || i === 2 ? C.yellow : C.muted }}>{s.k}</div>
                <div style={{ fontSize: 31, fontWeight: 600, marginTop: 10, lineHeight: 1.2 }}>{s.t}</div>
              </div>
              {i < steps.length - 1 ? (
                <span style={{ opacity: fadeIn(frame, steps[i + 1].at, 10), fontSize: 40, color: C.muted }}>→</span>
              ) : null}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 56 }}>
          {proof.map((p) => (
            <div
              key={p.t}
              style={{
                ...rise(frame, p.at, 20),
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                padding: "18px 26px",
                borderRadius: 18,
                background: C.yellow,
                fontFamily: SANS,
                color: C.ink,
              }}
            >
              <b style={{ fontFamily: DISPLAY, fontSize: 48, letterSpacing: "-0.04em" }}>{p.n}</b>
              <span style={{ fontSize: 26, fontWeight: 500 }}>{p.t}</span>
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/* 9 ─ Close */
export function Close() {
  const frame = useCurrentFrame();
  const end = at("L18", 0) - 6;
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const out = interpolate(frame, [end, end + 7], [1, 0], clamp);
  const flip = interpolate(frame, [end + 4, end + 14], [0, 1], clamp);
  const show = interpolate(frame, [end + 12, end + 22], [0, 1], clamp);
  return (
    <>
      <Sfx name="chime" at={end + 10} volume={0.45} />
      <Stage bg={C.yellow}>
        <div style={{ position: "absolute", left: 140, right: 140, top: 300, opacity: out }}>
          <div style={{ ...rise(frame, 4), fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.ink }}>
            UN Sustainable Development Goal 4.5
          </div>
          <div style={{ ...rise(frame, 10), fontFamily: DISPLAY, fontSize: 112, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1, color: C.ink, marginTop: 20 }}>
            Equal access to education starts with a complete kit.
          </div>
        </div>
      </Stage>
      <div style={{ position: "absolute", inset: 0, background: C.ink, opacity: flip }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center", opacity: show }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <BrandMark size={104} />
            <span style={{ fontFamily: DISPLAY, fontSize: 132, fontWeight: 700, letterSpacing: "-0.05em", color: "#fff" }}>KitBridge</span>
          </div>
          <div style={{ fontFamily: SANS, fontSize: 40, color: "#E4E2DC", marginTop: 26 }}>
            From donated supplies to complete kits.
          </div>
          <div style={{ ...rise(frame, end + 24), fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.yellow, marginTop: 56 }}>
            kitbridge-sigma.vercel.app
          </div>
          <div style={{ ...rise(frame, end + 30), fontFamily: SANS, fontSize: 24, color: C.mutedDark, marginTop: 14 }}>
            Open source · runs in your browser · github.com/Yun-0000/KitBridge
          </div>
        </div>
      </div>
    </>
  );
}

