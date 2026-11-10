// Complex playground: up to three complex numbers z1, z2, z3 drawn as yellow arrows from the
// origin and draggable by their tips, and any expressions in them, typed in the field below
// the figure, drawn as further arrows that follow the numbers live. Ctrl-click (or ⌘-click)
// on the plane adds the next number there, and on a number's tip removes it, along with
// every expression that uses it. The plane starts empty, with a hint saying so. Drag the
// background to pan; scroll, pinch or use the buttons to zoom; the ⛶ button takes the whole
// window. A tip dragged close to a grid node, the unit circle or an axis snaps onto it. The
// toggles label every arrow in Cartesian form (a + bi, with
// dashed projections onto the axes) and in polar form (r e^{iθ}, with θ as a multiple of π
// and a spiral at the origin for it). A number's θ is unwrapped: dragged round the origin,
// it keeps counting past π instead of jumping to −π, and the spiral winds with it.
//
// An expression is compiled, when it is typed, to a function of the numbers that returns the
// set of its values, since roots(z, 5) has five and every operation combines all the values
// of its operands. The syntax is the usual one: + − * / ^ and parentheses, juxtaposition for
// multiplication (2i, z1 z2), the constants i, e and pi, and the functions conj, abs, arg,
// re, im, exp, log, sqrt and roots(z, n). Powers and sqrt are single-valued (the principal
// value); only roots gives all n.
//
// The whole picture is one SVG rebuilt from a string on every change. The state is the
// numbers, the expressions and the view: the number at the centre and the pixels per unit.

const SVG = "http://www.w3.org/2000/svg";
const CONTROL_COLORS = {z1: "#d4aa00", z2: "#d4aa00", z3: "#d4aa00"}; // the numbers are all yellow...
const EXPRESSION_COLORS = ["#0072B2", "#009E73", "#D55E00", "#CC79A7", "#56B4E9", "#000000"]; // ...and the expressions are not
const GRAB = 16; // px around an arrowhead within which a press picks it up
const SNAP = 10; // px within which a dragged tip snaps onto a grid node, the unit circle or an axis
const MAX_VALUES = 64; // an expression's values are cut off there, for roots of roots of roots
const MAX_WIDTH = 640;

const it = s => `<tspan font-style="italic">${s}</tspan>`;
const I = it("i");
const THIN = " "; // a thin space after an italic i, which leans into what follows

export function createComplexPlaygroundWidget({
  variables = {},
  expressions: initialExpressions = [],
  cartesian = false,
  polar = false,
  width = MAX_WIDTH,
} = {}) {
  const vars = {};   // name → [re, im], for the numbers that exist
  const angles = {}; // name → its argument, unwrapped: a number dragged round the origin keeps counting
  for (const name of Object.keys(CONTROL_COLORS)) {
    if (variables[name]) { vars[name] = [...variables[name]]; angles[name] = arg(vars[name]); }
  }
  const expressions = []; // {text, color, evaluate, values, error}
  let W = Math.min(width, MAX_WIDTH), H = W;
  let center = [0, 0]; // the complex number at the middle of the picture
  let scale = W / 7;   // pixels per unit: ±3.5 in view to start with

  const container = document.createElement("div");
  const NORMAL = `max-width:${W}px;font:15px sans-serif;`;
  const FULL = "position:fixed;inset:0;z-index:9999;background:#fff;padding:8px;box-sizing:border-box;" +
    "display:flex;flex-direction:column;font:15px sans-serif;";
  container.style.cssText = NORMAL;

  const controls = document.createElement("div");
  controls.style.cssText = "display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center;margin-bottom:6px;";
  const cartesianBox = checkbox("Cartesian", cartesian, render);
  const polarBox = checkbox("Polar", polar, render);
  const zoomOut = button("−", () => zoom(1 / 1.5, [W / 2, H / 2]));
  zoomOut.style.marginLeft = "auto";
  controls.append(cartesianBox.label, polarBox.label, zoomOut, button("+", () => zoom(1.5, [W / 2, H / 2])),
    button("⛶", toggleFullWindow, "Full window"));
  container.appendChild(controls);

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "complex-playground"); // the thumbnail script waits for it
  svg.style.cssText = "display:block;width:100%;aspect-ratio:1;background:#fff;box-shadow:0 0 0 1px #ddd;" +
    "border-radius:8px;touch-action:none;user-select:none;cursor:grab;";
  container.appendChild(svg);

  const form = document.createElement("form");
  form.style.cssText = "display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px;";
  const input = document.createElement("input");
  input.placeholder = "z1^3, roots(z1, 5), (z1 + z2)/2, exp(i z1) …";
  input.style.cssText = "flex:1;min-width:200px;font:inherit;padding:4px 8px;border:1px solid #ccc;border-radius:6px;";
  const chips = document.createElement("span");
  chips.style.cssText = "display:contents;";
  form.append(input, chips);
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (add(input.value)) input.value = "";
  });
  input.addEventListener("input", e => { e.stopPropagation(); input.setCustomValidity(""); });
  container.appendChild(form);

  function add(text) {
    text = text.trim();
    if (!text) return false;
    try {
      const color = EXPRESSION_COLORS.find(c => !expressions.some(x => x.color === c)) ??
        EXPRESSION_COLORS[expressions.length % EXPRESSION_COLORS.length];
      expressions.push({text, evaluate: compile(text), color});
    } catch (e) {
      input.setCustomValidity(e.message);
      input.reportValidity();
      return false;
    }
    emit();
    return true;
  }

  // ---- coordinates ------------------------------------------------------------------------------

  const toPx = ([re, im]) => [W / 2 + (re - center[0]) * scale, H / 2 - (im - center[1]) * scale];
  const toZ = ([x, y]) => [center[0] + (x - W / 2) / scale, center[1] - (y - H / 2) / scale];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const gridStep = () => niceStep(70 / scale); // grid spacing in units: about one line per 70 px
  function pointer(e) {
    const r = svg.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  }
  // The name of the number whose tip is under the pointer, if any.
  function hit(p) {
    return Object.keys(vars).find(name => dist(p, toPx(vars[name])) <= GRAB);
  }
  // Onto the nearest grid node, else the unit circle, else an axis, whichever is close
  // enough first; not onto other grid lines, so 1 + 3.234i stays where it is put.
  function snap(z) {
    const step = gridStep(), r = Math.hypot(z[0], z[1]) || 1;
    const near = v => Math.round(v / step) * step;
    const candidates = [[near(z[0]), near(z[1])], [z[0] / r, z[1] / r], [0, z[1]], [z[0], 0]];
    return candidates.find(c => dist(c, z) * scale < SNAP) ?? z;
  }

  function zoom(k, p) {
    const z = toZ(p); // the number under the pointer stays under the pointer
    scale = Math.max(1e-3, Math.min(1e6, scale * k));
    center = [z[0] - (p[0] - W / 2) / scale, z[1] + (p[1] - H / 2) / scale];
    render();
  }

  // ---- interaction ------------------------------------------------------------------------------

  let drag = null; // {what: a number's name | "pan", p: [x, y], center: [re, im]}

  svg.addEventListener("pointerdown", e => {
    const p = pointer(e);
    if (e.ctrlKey || e.metaKey) { // add a number here, or remove the one under the pointer
      const name = hit(p);
      if (name) { // and the expressions that use it go with it
        delete vars[name];
        delete angles[name];
        for (let i = expressions.length; i--;) if (new RegExp(`\\b${name}\\b`).test(expressions[i].text)) expressions.splice(i, 1);
      } else {
        const free = Object.keys(CONTROL_COLORS).find(n => !vars[n]);
        if (free) { vars[free] = snap(toZ(p)); angles[free] = arg(vars[free]); }
      }
      emit();
      return;
    }
    if (e.button !== 0) return;
    drag = {what: hit(p) ?? "pan", p, center};
    svg.setPointerCapture(e.pointerId);
    svg.style.cursor = "grabbing";
  });
  svg.addEventListener("pointermove", e => {
    const p = pointer(e);
    if (!drag) {
      svg.style.cursor = hit(p) ? "pointer" : "grab";
    } else if (drag.what === "pan") {
      center = [drag.center[0] - (p[0] - drag.p[0]) / scale, drag.center[1] + (p[1] - drag.p[1]) / scale];
      render();
    } else {
      vars[drag.what] = snap(toZ(p));
      angles[drag.what] = unwrap(arg(vars[drag.what]), angles[drag.what]);
      emit();
    }
  });
  const release = () => { drag = null; svg.style.cursor = "grab"; };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
  svg.addEventListener("contextmenu", e => e.preventDefault()); // ctrl-click is a right click on a Mac
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoom(Math.exp(-e.deltaY * 0.002), pointer(e));
  }, {passive: false});

  // ---- full window ------------------------------------------------------------------------------
  // The Fullscreen API where it works (which, inside an iframe, needs allowfullscreen), and
  // otherwise the widget fixed over the whole window, which Escape also leaves.

  let overlay = false;
  function toggleFullWindow() {
    if (document.fullscreenElement === container) document.exitFullscreen();
    else if (overlay) setOverlay(false);
    else (container.requestFullscreen?.() ?? Promise.reject()).catch(() => setOverlay(true));
  }
  function setOverlay(on) {
    overlay = on;
    layout();
  }
  function layout() {
    const full = overlay || document.fullscreenElement === container;
    container.style.cssText = full ? FULL : NORMAL;
    svg.style.aspectRatio = full ? "auto" : "1";
    svg.style.flex = full ? "1" : "";
    svg.style.minHeight = full ? "0" : "";
  }
  document.addEventListener("fullscreenchange", layout);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && overlay) setOverlay(false); });

  // ---- drawing ----------------------------------------------------------------------------------

  function render() {
    const step = gridStep();
    const ticks = Math.max(0, -Math.floor(Math.log10(step)));      // decimals for the tick labels
    const decimals = Math.max(0, 2 - Math.floor(Math.log10(step))); // and for the values
    const [x0, y0] = toPx([0, 0]);
    const [reMin, imMax] = toZ([0, 0]), [reMax, imMin] = toZ([W, H]);
    // Tick labels sit by the axes, or by the nearest edge when the axis is out of view.
    const ty = clamp(y0 + 16, 16, H - 5), tx = clamp(x0 - 5, 40, W - 5);

    let grid = "", labels = "";
    for (let k = Math.ceil(reMin / step); k * step <= reMax; k++) {
      const x = toPx([k * step, 0])[0];
      grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
      if (k) labels += `<text x="${x}" y="${ty}" text-anchor="middle">${num(k * step, ticks)}</text>`;
    }
    for (let k = Math.ceil(imMin / step); k * step <= imMax; k++) {
      const y = toPx([0, k * step])[1];
      grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
      if (k) labels += `<text x="${tx}" y="${y + 4}" text-anchor="end">${imag(k * step, ticks)}</text>`;
    }

    // Every arrow to draw: the expressions' values first, then the numbers on top of them.
    const arrows = [];
    for (const x of expressions) {
      try { x.values = x.evaluate(vars); x.error = null; } catch (e) { x.values = []; x.error = e.message; }
      x.values.forEach((z, k) => arrows.push({z, color: x.color, name: k ? "" : pretty(x.text)}));
    }
    for (const name in vars) arrows.push({z: vars[name], theta: angles[name], color: CONTROL_COLORS[name], name: `${it("z")}${name[1]}`});

    let marks = "";
    arrows.forEach(({z, theta = arg(z), color, name}, i) => {
      const [x, y] = toPx(z);
      const r = Math.hypot(z[0], z[1]);
      if (cartesianBox.input.checked) {
        marks += `<path d="M${x},${y}V${y0}M${x},${y}H${x0}" stroke="${color}" stroke-dasharray="4 4" opacity=".6"/>`;
      }
      const a = 28 + 8 * i; // the angle arc's radius: one ring per arrow
      if (polarBox.input.checked && r * scale > a) marks += spiral([x0, y0], a, theta, color);
      marks += arrow([x0, y0], [x, y], color);
      const lines = [];
      if (cartesianBox.input.checked) lines.push(`${name && name + " = "}${cartesianForm(z, decimals)}`);
      if (polarBox.input.checked) lines.push(`${lines.length ? "= " : name && name + " = "}${polarForm(r, theta, decimals)}`);
      if (!lines.length && name) lines.push(name);
      if (lines.length) marks += label([x, y], [x - x0, y - y0], lines, color);
    });

    const hint = arrows.length ? "" :
      halo(`<text x="${W / 2}" y="${H / 2 - 40}" font-size="16" fill="#888" text-anchor="middle">cmd-click / ctrl-click to add a complex ${it("z")}</text>`);

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML =
      `<g stroke="#eee">${grid}</g>` +
      `<circle cx="${x0}" cy="${y0}" r="${scale}" fill="none" stroke="#ccc" stroke-dasharray="4 4"/>` +
      `<path d="M0,${y0}H${W}M${x0},0V${H}" stroke="#999"/>` +
      `<g font-size="12" fill="#777">${labels}</g>` +
      `<g stroke-width="2.5" stroke-linecap="round">${marks}</g>` +
      hint;

    // The list of expressions under the field, each with its colour and a button to remove it.
    chips.replaceChildren(...expressions.map((x, i) => {
      const chip = document.createElement("span");
      chip.style.cssText = `display:inline-flex;align-items:center;gap:4px;color:${x.color};font-weight:600;`;
      chip.append(x.text, x.error ? note(x.error) : "", button("×", () => { expressions.splice(i, 1); emit(); }, "Remove"));
      return chip;
    }));
  }

  function arrow([x0, y0], [x, y], color) {
    const L = Math.hypot(x - x0, y - y0);
    if (L < 1) return `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
    const h = Math.min(12, L), ux = (x - x0) / L * h, uy = (y - y0) / L * h; // the head's length along the arrow
    const bx = x - ux, by = y - uy; // the base of the head
    return `<line x1="${x0}" y1="${y0}" x2="${bx}" y2="${by}" stroke="${color}"/>` +
      `<polygon points="${x},${y} ${bx - uy * 0.4},${by + ux * 0.4} ${bx + uy * 0.4},${by - ux * 0.4}" fill="${color}"/>`;
  }

  // Text just beyond the tip, continuing the arrow's direction; none for a tip out of view.
  function label([x, y], [dx, dy], lines, color) {
    if (x < 0 || x > W || y < 0 || y > H) return "";
    const L = Math.hypot(dx, dy) || 1;
    const ax = x + dx / L * 14, ay = y + dy / L * 14 + 5 - (dy < 0 ? (lines.length - 1) * 18 : 0);
    const tspans = lines.map((t, i) => `<tspan x="${ax}" dy="${i ? 18 : 0}">${t}</tspan>`).join("");
    return halo(`<text x="${ax}" y="${ay}" font-size="15" font-weight="600" fill="${color}" text-anchor="${dx < 0 ? "end" : "start"}">${tspans}</text>`);
  }

  // ---- value ------------------------------------------------------------------------------------

  function emit() {
    render();
    container.value = {
      variables: Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, [...v]])),
      angles: {...angles}, // unwrapped, in radians
      expressions: expressions.map(({text, values}) => ({text, values})),
    };
    const plain = ([re, im]) => `${num(re, 2)} + ${num(im, 2)}i`;
    svg.setAttribute("aria-label", `The complex plane with ${Object.keys(vars).map(k => `${k} = ${plain(vars[k])}`).join(", ")} ` +
      `and ${expressions.length} expression${expressions.length === 1 ? "" : "s"} drawn as arrows from the origin.`);
    container.dispatchEvent(new CustomEvent("input", {bubbles: true}));
  }

  for (const text of initialExpressions) add(text);
  emit();

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => {
      const r = svg.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (!(w > 0 && h > 0) || (w === W && h === H)) return;
      scale *= Math.min(w, h) / Math.min(W, H); // keep the same numbers across the short side
      W = w; H = h;
      render();
    }).observe(svg);
  }

  return container;
}

// ---- expressions --------------------------------------------------------------------------------

const FUNCTIONS = {
  conj: ([a, b]) => [a, -b],
  abs: ([a, b]) => [Math.hypot(a, b), 0],
  arg: ([a, b]) => [Math.atan2(b, a), 0],
  re: ([a]) => [a, 0],
  im: ([, b]) => [b, 0],
  exp: ([a, b]) => [Math.exp(a) * Math.cos(b), Math.exp(a) * Math.sin(b)],
  log: ([a, b]) => [Math.log(Math.hypot(a, b)), Math.atan2(b, a)],
};
const CONSTANTS = {i: [0, 1], e: [Math.E, 0], pi: [Math.PI, 0], π: [Math.PI, 0]};
const mul = ([a, b], [c, d]) => [a * c - b * d, a * d + b * c];
const div = ([a, b], [c, d]) => [(a * c + b * d) / (c * c + d * d), (b * c - a * d) / (c * c + d * d)];

// z^w, the principal value: exp(w log z).
function pow(z, w) {
  const [c, d] = w;
  if (z[0] === 0 && z[1] === 0) return c > 0 ? [0, 0] : c === 0 && d === 0 ? [1, 0] : [NaN, NaN];
  return FUNCTIONS.exp(mul(w, FUNCTIONS.log(z)));
}
// The n n-th roots of z: r^(1/n) e^{i(θ + 2πk)/n} for k = 0 … n−1.
function roots([a, b], [n, m]) {
  if (m !== 0 || !isInteger(n) || n < 1) throw new Error("roots(z, n) needs a whole number n");
  n = Math.round(n);
  const r = Math.hypot(a, b) ** (1 / n), theta = Math.atan2(b, a);
  return Array.from({length: n}, (_, k) => [r * Math.cos((theta + 2 * Math.PI * k) / n), r * Math.sin((theta + 2 * Math.PI * k) / n)]);
}

// Compiles an expression to a function of the variables returning the list of its values,
// by recursive descent: sum > product > unary minus > power > atom. Every operation is
// applied to all combinations of its operands' values.
function compile(text) {
  const tokens = text.match(/\d*\.?\d+|[a-zA-Zπ_]\w*|[-+*/^()]|\S/g) ?? [];
  let k = 0;
  const peek = () => tokens[k], next = () => tokens[k++];
  const expect = t => { if (next() !== t) throw new SyntaxError(`Expected ${t}`); };
  const map1 = (f, a) => vars => a(vars).map(f);
  const map2 = (f, a, b) => vars => a(vars).flatMap(x => b(vars).map(y => f(x, y)));
  const flat2 = (f, a, b) => vars => a(vars).flatMap(x => b(vars).flatMap(y => f(x, y)));

  function sum() {
    let a = product();
    while (peek() === "+" || peek() === "-") {
      a = map2(next() === "+" ? ([a, b], [c, d]) => [a + c, b + d] : ([a, b], [c, d]) => [a - c, b - d], a, product());
    }
    return a;
  }
  function product() {
    let a = unary();
    for (;;) {
      if (peek() === "*" || peek() === "/") a = map2(next() === "*" ? mul : div, a, unary());
      else if (peek() !== undefined && !/^[-+)^,]$/.test(peek())) a = map2(mul, a, unary()); // juxtaposition: 2i, z1 z2
      else return a;
    }
  }
  function unary() {
    return peek() === "-" ? (next(), map1(([a, b]) => [-a, -b], unary())) : power();
  }
  function power() {
    const a = atom();
    return peek() === "^" ? (next(), map2(pow, a, unary())) : a;
  }
  function atom() {
    const t = next();
    if (t === "(") { const a = sum(); expect(")"); return a; }
    if (/^[\d.]/.test(t)) { const v = [Number(t), 0]; return () => [v]; }
    if (t in CONSTANTS) return () => [CONSTANTS[t]];
    if (t in FUNCTIONS || t === "sqrt" || t === "roots") {
      expect("(");
      const a = sum();
      if (t === "roots") { expect(","); const n = sum(); expect(")"); return flat2(roots, a, n); }
      expect(")");
      return t === "sqrt" ? map2(pow, a, () => [[0.5, 0]]) : map1(FUNCTIONS[t], a);
    }
    if (/^z[1-3]$/.test(t)) return vars => { if (!vars[t]) throw new Error(`There is no ${t}`); return [vars[t]]; };
    throw new SyntaxError(t === undefined ? "Unexpected end" : `Unexpected ${t}`);
  }

  const f = sum();
  if (k < tokens.length) throw new SyntaxError(`Unexpected ${peek()}`);
  return vars => distinct(f(vars)).slice(0, MAX_VALUES);
}

// The finite values, without repeats (z^(1/2) z^(1/2) has two values, not four).
function distinct(values) {
  const out = [];
  for (const v of values) {
    if (Number.isFinite(v[0]) && Number.isFinite(v[1]) && !out.some(u => Math.hypot(u[0] - v[0], u[1] - v[1]) < 1e-9)) out.push(v);
  }
  return out;
}

// The expression as typed, with z and i in italics, π, and a dot for *.
function pretty(text) {
  return text.replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]))
    .replace(/\bz(?=[1-3]\b)/g, it("z"))
    .replace(/\bi\b( ?)/g, (_, space) => I + (space || THIN))
    .replace(/\bpi\b/g, "π")
    .replace(/\*/g, "·");
}

// ---- small helpers ------------------------------------------------------------------------------

// The smallest of 1, 2, 5 × 10ⁿ that is at least x.
function niceStep(x) {
  const p = 10 ** Math.floor(Math.log10(x));
  return [1, 2, 5, 10].map(m => m * p).find(s => s >= x);
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
const arg = ([re, im]) => Math.atan2(im, re);
// theta moved by whole turns to be the one nearest its previous value, so a number dragged
// round the origin keeps counting instead of jumping from π to −π.
function unwrap(theta, previous = theta) {
  return theta + 2 * Math.PI * Math.round((previous - theta) / (2 * Math.PI));
}
// The angle theta drawn at the origin, from the positive real axis, as a spiral that gains
// SPIRAL_PITCH px of radius a turn, so that more than one turn can be seen.
const SPIRAL_PITCH = 6;
function spiral([x0, y0], a, theta, color) {
  const n = Math.max(1, Math.ceil(Math.abs(theta) / (Math.PI / 36)));
  const points = Array.from({length: n + 1}, (_, k) => {
    const phi = theta * k / n, r = a + SPIRAL_PITCH * Math.abs(phi) / (2 * Math.PI);
    return `${x0 + r * Math.cos(phi)},${y0 - r * Math.sin(phi)}`;
  });
  return `<polyline points="${points.join(" ")}" stroke="${color}" fill="none"/>`;
}
const isZero = (x, d) => Math.abs(x) < 0.5 * 10 ** -d;
const isInteger = x => Math.abs(x - Math.round(x)) < 1e-9;
// A number to d decimals, with none for an integer, a proper minus sign, and no "−0".
function num(x, d) {
  if (isZero(x, d)) return "0";
  return (isInteger(x) ? String(Math.round(x)) : x.toFixed(d)).replace("-", "−");
}
// An imaginary number: i, −i, 2i, 1.50i.
function imag(x, d) {
  const a = Math.abs(x);
  return (x < 0 ? "−" : "") + (isInteger(a) && Math.round(a) === 1 ? "" : num(a, d)) + I;
}
// a + bi, dropping whichever part is zero (and 0 for zero itself).
function cartesianForm([re, im], d) {
  if (isZero(im, d)) return num(re, d);
  if (isZero(re, d)) return imag(im, d);
  return `${num(re, d)} ${im < 0 ? "−" : "+"} ${imag(Math.abs(im), d)}`;
}
// r e^{iθ} with θ as a multiple of π: a fraction like 3π/4 when it is one, else a decimal.
function polarForm(r, theta, d) {
  const t = theta / Math.PI; // in (−1, 1]
  if (isZero(r, d)) return "0";
  if (Math.abs(t) < 1e-9) return num(r, d);
  const a = Math.abs(t);
  const den = [1, 2, 3, 4, 6, 8, 12].find(q => isInteger(a * q));
  const p = den && Math.round(a * den);
  const angle = den ? `${p === 1 ? "" : p}π${den === 1 ? "" : "/" + den}` : `${num(a, d)}π`;
  return `${num(r, d)} ${it("e")}<tspan dy="-7" font-size="11">${t < 0 ? "−" : ""}${I}${THIN}${angle}</tspan>`;
}
// A white outline behind text, for legibility over the grid and the arrows: a stroked copy
// underneath, rather than paint-order, so that no glyph's outline eats its thin neighbour.
function halo(text) {
  return text.replace("<text ", `<text stroke="#fff" stroke-width="4" stroke-linejoin="round" `) + text;
}
function note(text) {
  const n = document.createElement("span");
  n.textContent = text;
  n.style.cssText = "color:#c00;font-weight:400;font-size:13px;";
  return n;
}
function checkbox(text, checked, onchange) {
  const label = document.createElement("label");
  label.style.cssText = "display:inline-flex;align-items:center;gap:6px;cursor:pointer;";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("input", e => { e.stopPropagation(); onchange(); }); // not a change of value
  label.append(input, text);
  return {label, input};
}
function button(text, onclick, title) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  if (title) b.title = title;
  b.style.cssText = "font:16px/1 sans-serif;width:28px;height:28px;padding:0;cursor:pointer;" +
    "border:1px solid #ccc;border-radius:6px;background:#fff;color:#333;";
  b.addEventListener("click", onclick);
  return b;
}
