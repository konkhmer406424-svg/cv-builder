/* ==========================================================================
   cv-photo.js — រូបថត CV: ថតភ្លាមៗ · កាត់ (crop) · ប្តូរទំហំ · ដកផ្ទៃខាងក្រោយ · ដាក់ពណ៌ខាងក្រោយ · បង្រួមទំហំឯកសារ
   Photo tool for CV Builder. One file, no libraries, everything runs ON THE USER'S DEVICE (the photo is never uploaded).

   Quick start (2 lines, after the page has loaded):
     <script src="cv-photo.js"></script>
     <script> CVPhoto.attach(document.querySelector('#photoInput')); </script>
   → the existing <input type="file"> keeps working: when the user picks a picture, the editor opens first, and the
     site's own code then receives the EDITED picture (same input, same "change" event). A "📷 ថត / កែរូប" button is added
     next to the input (camera + gallery + editor).

   Or call it yourself:
     CVPhoto.open({ file:null, aspect:"3x4", maxKB:250,
                    onDone:(dataUrl, info) => { img.src = dataUrl; } });   // info = {width,height,kb,format,blob}

   Options   aspect: "3x4" (default) | "4x6" | "1x1"   · aspects: ["3x4","4x6","1x1"] (which buttons to show)
             outWidth: px width of the result (default 600 for 3x4 and 1x1, 800 for 4x6)
             maxKB: the result is compressed until it is smaller (default 250) → safe for localStorage and PDF
             bg: starting background colour ("#ffffff"; "transparent" is allowed)
             button:false (attach only) = do not add the extra button
   Needs HTTPS (or localhost) for the camera. GitHub Pages is HTTPS, so it works.

   Changes in this version
     - New look: site colours, bottom sheet on phones / two panes on desktop, SVG icons, face guide, switch for background removal.
     - Camera: closing the editor / pressing Back / switching camera while the camera is still starting no longer
       leaves the camera light on (a late stream is stopped; see S.camTok).
     - "Use this photo" cannot fire twice (S.busy).
     - Pending timers are cleared when the editor closes.
   ========================================================================== */
(function (global) {
  "use strict";

  /* ------------------------------ text (Khmer / English) ------------------------------ */
  const T = {
    title: "រូបថត / Photo",
    camera: "ថតភ្លាមៗ / Take a photo",
    gallery: "ជ្រើសពីឧបករណ៍ / Choose from device",
    tips: "ដាក់មុខនៅកណ្តាល ពន្លឺមកពីមុខ ផ្ទៃខាងក្រោយសាមញ្ញ / Centre your face, light from the front, plain background",
    capture: "ថត / Capture",
    switchCam: "ប្តូរ / Switch",
    back: "ត្រឡប់ / Back",
    zoom: "ពង្រីក / Zoom",
    adjust: "កែតម្រូវ / Adjust",
    rotL: "បង្វិលឆ្វេង / Rotate left", rotR: "បង្វិលស្តាំ / Rotate right", flip: "ត្រឡប់ / Flip",
    size: "ទំហំ / Size",
    bg: "ផ្ទៃខាងក្រោយ / Background",
    remove: "ដកផ្ទៃខាងក្រោយ / Remove background",
    strength: "កម្រិតដក / Strength",
    removeHint: "ល្អបំផុតពេលផ្ទៃខាងក្រោយមានពណ៌តែមួយ (ជញ្ជាំងស...) / Works best on a plain background",
    working: "កំពុងដំណើរការ… / Working…",
    noBg: "រកមិនឃើញផ្ទៃខាងក្រោយ — សាកកើនកម្រិត / Background not found — raise the strength",
    allBg: "ដកច្រើនពេក — សាកបន្ថយកម្រិត / Removed too much — lower the strength",
    done: "ប្រើរូបនេះ / Use this photo",
    again: "ថតម្តងទៀត / Retake",
    guide: "ខ្សែណែនាំមុខ / Face guide",
    hint: "អូសដើម្បីរំកិល ច្បិចដើម្បីពង្រីក / Drag to move, pinch to zoom",
    privacy: "កែក្នុងឧបករណ៍របស់អ្នក មិនបញ្ជូនរូបទៅកន្លែងណាទេ / Edited on your device — nothing is uploaded",
    camErr: "មិនអាចបើកកាមេរ៉ា។ សូមអនុញ្ញាតកាមេរ៉ា ឬជ្រើសរូបពីឧបករណ៍ / Cannot open the camera. Allow camera access or choose a photo.",
    loadErr: "មិនអាចបើករូបនេះ / Cannot open this picture",
    openBtn: "📷 ថត / កែរូប  Take / Edit photo",
    custom: "ពណ៌ផ្សេង / Custom colour"
  };
  const svg = (p, s) => '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const I = {
    cam: svg('<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>', 24),
    img: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>', 24),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 16),
    tip: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>', 16),
    rotL: svg('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>'),
    rotR: svg('<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v4h-4"/>'),
    flip: svg('<path d="M12 3v18"/><path d="M8 7l-5 5 5 5z"/><path d="M16 7l5 5-5 5z"/>'),
    back: svg('<path d="M15 5l-7 7 7 7"/>'),
    swap: svg('<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 16),
    checkB: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    minus: svg('<path d="M5 12h14"/>', 16),
    plus: svg('<path d="M5 12h14M12 5v14"/>', 16),
    spark: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17v4M17 19h4"/>', 22)
  };
  // "ខ្មែរ / English" -> two spans (Khmer first, English smaller)
  const lb = t => { const i = t.indexOf(" / "); return i < 0 ? t : '<span class="cvp-k">' + t.slice(0, i) + '</span><span class="cvp-e">' + t.slice(i + 3) + '</span>'; };

  const SIZES = { "3x4": { a: 3 / 4, w: 600, label: "3×4" }, "4x6": { a: 2 / 3, w: 800, label: "4×6" }, "1x1": { a: 1, w: 600, label: "1:1" } };
  const SWATCHES = ["#ffffff", "#e6e6e6", "#cfe3f7", "#2d6cdf", "#d33a3a", "transparent"];
  const BASE_MAX = 1600;   // longest side of the working picture (memory + speed)

  /* ------------------------------ core (pure, testable) ------------------------------ */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function makeCanvas(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  // crop rectangle (in picture pixels) for a frame of the given aspect, zoom (1 = largest frame that fits) and centre
  function cropRect(W, H, aspect, zoom, cx, cy) {
    let bw, bh;
    if (W / H > aspect) { bh = H; bw = H * aspect; } else { bw = W; bh = W / aspect; }
    const w = bw / zoom, h = bh / zoom;
    const x = w <= W ? clamp(cx - w / 2, 0, W - w) : clamp(cx - w / 2, W - w, 0);   // zoom < 1: the frame may be bigger than the picture
    const y = h <= H ? clamp(cy - h / 2, 0, H - h) : clamp(cy - h / 2, H - h, 0);
    return { x, y, w, h };
  }

  // draw the rectangle of src into a dw×dh canvas; outside the picture = fill colour (or transparent)
  function drawCrop(ctx, src, r, dw, dh, fill) {
    ctx.save();
    ctx.clearRect(0, 0, dw, dh);
    if (fill && fill !== "transparent") { ctx.fillStyle = fill; ctx.fillRect(0, 0, dw, dh); }
    const sx = dw / r.w, sy = dh / r.h;
    const ix = Math.max(0, r.x), iy = Math.max(0, r.y), ix2 = Math.min(src.width, r.x + r.w), iy2 = Math.min(src.height, r.y + r.h);
    if (ix2 > ix && iy2 > iy) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, ix, iy, ix2 - ix, iy2 - iy, (ix - r.x) * sx, (iy - r.y) * sy, (ix2 - ix) * sx, (iy2 - iy) * sy);
    }
    ctx.restore();
  }

  // rotate (quarter turns) and flip horizontally (as the user sees it)
  function orient(src, rot, flip) {
    const odd = rot % 2 === 1;
    const c = makeCanvas(odd ? src.height : src.width, odd ? src.width : src.height);
    const ctx = c.getContext("2d");
    ctx.translate(c.width / 2, c.height / 2);
    if (flip) ctx.scale(-1, 1);
    ctx.rotate(rot * Math.PI / 2);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);
    return c;
  }

  // scale a source (image/video/canvas) into a canvas whose longest side is <= max
  function toBase(src, sw, sh, max) {
    const k = Math.min(1, max / Math.max(sw, sh));
    const c = makeCanvas(sw * k, sh * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  // Background removal for a PLAIN background: find the background colour on the picture border, then flood-fill inward
  // from the border over every pixel close to that colour. tol 1..100. Returns { data:ImageData, ratio:0..1 (share removed) }.
  function removeBackground(img, tol) {
    const w = img.width, h = img.height, src = img.data, N = w * h;
    const t = Math.max(2, Math.round(Math.min(w, h) * 0.02));
    const R = [], G = [], B = [];
    const take = (x, y) => { const i = (y * w + x) * 4; if (src[i + 3] > 200) { R.push(src[i]); G.push(src[i + 1]); B.push(src[i + 2]); } };
    for (let y = 0; y < h; y += 2) {                       // sample a thin ring along the picture border
      if (y < t || y >= h - t) { for (let x = 0; x < w; x += 2) take(x, y); }
      else { for (let x = 0; x < t; x += 2) take(x, y); for (let x = w - t; x < w; x += 2) take(x, y); }
    }
    const med = a => { a.sort((p, q) => p - q); return a.length ? a[a.length >> 1] : 255; };
    const rr = med(R), gg = med(G), bb = med(B);
    const thr = tol * 1.5, thr2 = thr * thr;
    const near = i => { const o = i * 4; if (src[o + 3] < 10) return true; const dr = src[o] - rr, dg = src[o + 1] - gg, db = src[o + 2] - bb; return dr * dr + dg * dg + db * db <= thr2; };

    const mask = new Uint8Array(N);            // 1 = background
    const stack = new Int32Array(N); let sp = 0;
    const push = i => { if (!mask[i] && near(i)) { mask[i] = 1; stack[sp++] = i; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (sp) {
      const i = stack[--sp], x = i % w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < N - w) push(i + w);
    }
    let bgCount = 0; for (let i = 0; i < N; i++) bgCount += mask[i];

    // erode the subject by 1px (kills the tinted edge), then feather the edge with a small blur
    const a = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (mask[i]) continue;
      const x = i % w;
      const edge = (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (i >= w && mask[i - w]) || (i < N - w && mask[i + w]);
      a[i] = edge ? 0 : 255;
    }
    const f = new Uint8Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; s += a[yy * w + xx]; n++; } }
      f[y * w + x] = s / n;
    }
    const out = new Uint8ClampedArray(src);
    for (let i = 0; i < N; i++) out[i * 4 + 3] = Math.min(out[i * 4 + 3], f[i]);
    return { data: { width: w, height: h, data: out }, ratio: bgCount / N };
  }

  const webpOK = (() => { let r; return () => { if (r === undefined) { try { r = makeCanvas(1, 1).toDataURL("image/webp").indexOf("data:image/webp") === 0; } catch (e) { r = false; } } return r; }; })();
  const toBlob = (c, type, q) => new Promise(res => c.toBlob(b => res(b), type, q));

  // encode until it is small enough: lower the quality first, then shrink the picture a little
  async function encode(canvas, type, maxKB) {
    let c = canvas, blob = null, q = 0.92;
    for (let pass = 0; pass < 4; pass++) {
      const qs = type === "image/png" ? [undefined] : [0.92, 0.85, 0.78, 0.7, 0.62, 0.55];
      for (q of qs) {
        blob = await toBlob(c, type, q);
        if (!blob) throw new Error("encode failed");
        if (blob.size <= maxKB * 1024) return { blob, quality: q, canvas: c };
      }
      const n = makeCanvas(c.width * 0.85, c.height * 0.85);
      n.getContext("2d").drawImage(c, 0, 0, n.width, n.height); c = n;
    }
    return { blob, quality: q, canvas: c };   // best effort
  }

  const readDataUrl = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });

  function loadImage(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      const done = () => res(img);
      img.onload = done; img.onerror = () => rej(new Error("load"));
      if (global.URL && URL.createObjectURL) { const u = URL.createObjectURL(file); img.onload = () => { try { URL.revokeObjectURL(u); } catch (e) {} done(); }; img.src = u; }
      else readDataUrl(file).then(d => { img.src = d; }, rej);
    });
  }

  /* ------------------------------ styles ------------------------------ */
  const CSS = `
.cvp-ov{position:fixed;inset:0;z-index:99999;background:rgba(28,27,25,.66);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;font-family:"Noto Sans Khmer",-apple-system,"Segoe UI",Roboto,sans-serif;color:#1c1b19;line-height:1.6}
.cvp-box{--ink:#1c1b19;--paper:#faf8f4;--line:#e4e0d8;--muted:#7a756a;--accent:#8a5a3b;--accent-2:#3b5a4a;--sand:#efe9dd;--tint:#f3e8df;background:var(--paper);width:100%;max-width:480px;max-height:96vh;max-height:96dvh;display:flex;flex-direction:column;overflow:hidden;border-radius:20px 20px 0 0;box-shadow:0 -8px 40px rgba(0,0,0,.3);animation:cvp-up .22s ease-out}
@keyframes cvp-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
@media(prefers-reduced-motion:reduce){.cvp-box{animation:none}.cvp-switch,.cvp-switch::after{transition:none!important}}
@media(min-width:720px){.cvp-ov{align-items:center;padding:16px}.cvp-box{border-radius:18px;max-height:calc(100vh - 32px)}.cvp-box.cvp-wide{max-width:820px}}
.cvp-hd{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px 10px 18px;border-bottom:1px solid var(--line);background:#fff}
.cvp-ttl{display:flex;align-items:baseline;gap:8px}.cvp-ttl b{font-size:16px}.cvp-ttl small{font-size:12px;color:var(--muted)}
.cvp-x{width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:50%;background:var(--sand);color:var(--ink);cursor:pointer;padding:0}
.cvp-bd{flex:1;min-height:0;overflow:auto;padding:16px 18px;display:flex;flex-direction:column;gap:14px}
.cvp-ft{flex-shrink:0;display:flex;gap:10px;justify-content:flex-end;align-items:center;padding:12px 18px;padding-bottom:max(12px,env(safe-area-inset-bottom));border-top:1px solid var(--line);background:#fff}
.cvp-k{font-size:14px;font-weight:600}.cvp-e{font-size:11.5px;color:var(--muted)}
.cvp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-align:center;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:12px;padding:8px 14px;min-height:46px;font:inherit;font-size:14px;cursor:pointer}
.cvp-btn:hover{background:var(--sand)}
.cvp-btn .cvp-k,.cvp-btn .cvp-e{display:inline}.cvp-btn .cvp-e{margin-left:6px;color:inherit;opacity:.75}
.cvp-btn.cvp-pri{background:var(--accent);border-color:var(--accent);color:#fff;flex:1;max-width:320px}.cvp-btn.cvp-pri:hover{background:#774c31}
.cvp-btn.cvp-ghost{border-color:transparent;background:transparent;color:var(--muted)}
.cvp-btn.cvp-ib{width:46px;padding:0}
.cvp-btn:disabled{opacity:.55;cursor:default}
.cvp-btn:focus-visible,.cvp-x:focus-visible,.cvp-sw:focus-visible,.cvp-seg button:focus-visible,.cvp-card:focus-visible,.cvp-rm-top:focus-visible,.cvp-shutter:focus-visible,.cvp-chipbtn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.cvp-src{display:grid;gap:10px;grid-template-columns:1fr}
.cvp-card{display:flex;align-items:center;gap:14px;text-align:left;padding:16px;border:1px solid var(--line);border-radius:16px;background:#fff;cursor:pointer;font:inherit;color:inherit}
.cvp-card:hover{border-color:var(--accent)}.cvp-card .cvp-k,.cvp-card .cvp-e{display:block}
.cvp-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--sand);color:var(--accent);flex-shrink:0}
@media(min-width:520px){.cvp-src{grid-template-columns:1fr 1fr}.cvp-card{flex-direction:column;align-items:flex-start;padding:20px 16px}}
.cvp-tip,.cvp-priv{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--muted)}.cvp-tip svg,.cvp-priv svg{flex-shrink:0;margin-top:3px;color:var(--accent-2)}
.cvp-tip .cvp-k,.cvp-priv .cvp-k{font-size:12.5px;font-weight:500;color:var(--ink)}.cvp-tip .cvp-e,.cvp-priv .cvp-e{display:block}
.cvp-stage{background:var(--ink);border-radius:16px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:12px}
.cvp-frame{position:relative;line-height:0}
.cvp-prev{display:block;border-radius:6px;touch-action:none;cursor:grab;background-color:#fff;background-image:linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%);background-size:14px 14px;background-position:0 0,0 7px,7px -7px,-7px 0;box-shadow:0 6px 24px rgba(0,0,0,.5)}
.cvp-guide{position:absolute;inset:8% 14%;border:2px dashed rgba(255,255,255,.85);border-radius:48% 48% 40% 40%/42% 42% 30% 30%;pointer-events:none}
.cvp-chips{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
.cvp-chip{font:inherit;font-size:12px;color:#e8e2d6;background:rgba(255,255,255,.12);border:0;border-radius:999px;padding:2px 12px;line-height:1.7}
.cvp-chip .cvp-k,.cvp-chip .cvp-e{display:inline;font-size:12px;font-weight:500;color:inherit}.cvp-chip .cvp-e{margin-left:5px;opacity:.7}
.cvp-chipbtn{cursor:pointer}.cvp-chipbtn[aria-pressed=true]{background:rgba(255,255,255,.28);color:#fff}
.cvp-hint{text-align:center;line-height:1.5}.cvp-hint .cvp-k,.cvp-hint .cvp-e{display:block;font-size:12px;font-weight:400;color:#b9b3a7}.cvp-hint .cvp-e{font-size:11px;opacity:.8}
.cvp-vid{position:relative;background:#000;border-radius:10px;overflow:hidden}
.cvp-vid video{width:100%;height:100%;object-fit:cover;display:block}
.cvp-edit{display:flex;flex-direction:column;gap:16px}
.cvp-ctl{display:flex;flex-direction:column;gap:18px;min-width:0;flex:1}
@media(min-width:720px){.cvp-edit{flex-direction:row;align-items:flex-start}.cvp-edit .cvp-stage{flex:0 0 380px;position:sticky;top:0}}
.cvp-sec{display:flex;flex-direction:column;gap:8px}
.cvp-lab .cvp-k{font-size:13px}.cvp-lab .cvp-e{margin-left:6px}
.cvp-seg{display:flex;gap:8px}
.cvp-seg button{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);font:inherit;font-size:13px;cursor:pointer}
.cvp-seg button.cvp-on{border-color:var(--accent);background:var(--tint);color:var(--accent);font-weight:600}
.cvp-ar{display:block;height:22px;border:2px solid currentColor;border-radius:3px}
.cvp-tools{display:flex;gap:8px;align-items:center}
.cvp-tools input[type=range]{flex:1;min-width:0;accent-color:var(--accent)}
.cvp-tools svg{color:var(--muted);flex-shrink:0}
.cvp-t3 .cvp-btn{flex:1;flex-direction:column;gap:2px;padding:8px 4px;font-size:12.5px}.cvp-t3 .cvp-e{display:none}.cvp-t3 .cvp-k{font-size:12.5px;font-weight:500}
.cvp-sws{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.cvp-sw{position:relative;width:38px;height:38px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line);cursor:pointer;padding:0;display:grid;place-items:center}
.cvp-sw svg{opacity:0}.cvp-sw.cvp-on{box-shadow:0 0 0 2px var(--accent)}.cvp-sw.cvp-on svg{opacity:1}
.cvp-sw.cvp-tr{background-color:#fff;background-image:linear-gradient(45deg,#bbb 25%,transparent 25%,transparent 75%,#bbb 75%),linear-gradient(45deg,#bbb 25%,transparent 25%,transparent 75%,#bbb 75%);background-size:10px 10px;background-position:0 0,5px 5px}
.cvp-cust{background:conic-gradient(#d33a3a,#e0a526,#4a9d5b,#2d6cdf,#9b4fc7,#d33a3a);overflow:hidden}
.cvp-cust::after{content:"";position:absolute;inset:7px;border-radius:50%;background:var(--c,transparent);border:2px solid #fff;display:none}.cvp-cust.cvp-on::after{display:block}
.cvp-cust input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:0;padding:0}
.cvp-rm{border:1px solid var(--line);border-radius:14px;background:#fff;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.cvp-rm-top{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer;border-radius:10px}
.cvp-rm-top .cvp-tx{flex:1}.cvp-rm-top .cvp-k,.cvp-rm-top .cvp-e{display:block}
.cvp-switch{width:46px;height:28px;border-radius:999px;background:#cfc9bd;position:relative;flex-shrink:0;transition:background .15s}
.cvp-switch::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s}
.cvp-rm-top[aria-checked=true] .cvp-switch{background:var(--accent-2)}.cvp-rm-top[aria-checked=true] .cvp-switch::after{transform:translateX(18px)}
.cvp-note{font-size:12px;color:var(--muted)}.cvp-note .cvp-k,.cvp-note .cvp-e{display:inline;font-size:12px;font-weight:400}.cvp-note .cvp-e{margin-left:4px}
.cvp-status{font-size:12.5px;color:#6b4329;background:var(--tint);border-radius:10px;padding:8px 12px}.cvp-status:empty{display:none}
.cvp-status .cvp-k,.cvp-status .cvp-e{display:inline;font-size:12.5px;font-weight:500;color:inherit}.cvp-status .cvp-e{margin-left:5px;opacity:.8}
.cvp-err{font-size:13px;color:#8f2d1f;background:#fbeae6;border-radius:12px;padding:10px 12px}
.cvp-err .cvp-k,.cvp-err .cvp-e{display:block;font-size:13px;font-weight:500;color:inherit}.cvp-err .cvp-e{font-weight:400;opacity:.85}
.cvp-ft.cvp-cam{justify-content:space-between}.cvp-cam .cvp-btn{width:104px;flex-direction:column;gap:0;padding:6px;font-size:12px;min-height:52px}.cvp-cam .cvp-btn .cvp-e{display:none}
.cvp-shutter{width:66px;height:66px;border-radius:50%;border:3px solid var(--accent);background:var(--accent);box-shadow:inset 0 0 0 4px #fff;cursor:pointer;padding:0}
.cvp-shutter:active{transform:scale(.95)}
`;
  function injectCss() { if (document.getElementById("cvp-css")) return; const s = document.createElement("style"); s.id = "cvp-css"; s.textContent = CSS; document.head.appendChild(s); }

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* ------------------------------ editor ------------------------------ */
  function open(opts) {
    opts = opts || {};
    injectCss();
    const aspects = (opts.aspects && opts.aspects.length ? opts.aspects : ["3x4", "4x6", "1x1"]).filter(k => SIZES[k]);
    const S = {
      base: null, rot: 0, flip: false, oriented: null, cut: null, cutOn: false, tol: 35,
      zoom: 1, cx: 0, cy: 0, aspectKey: SIZES[opts.aspect] ? opts.aspect : aspects[0],
      bg: opts.bg || "#ffffff", fw: 300, fh: 400, stream: null, facing: "user", token: 0,
      camTok: 0,     // bumped every time the camera is stopped / restarted → a late getUserMedia() result is recognised as stale
      busy: false    // true while "Use this photo" is working → no double click
    };
    const maxKB = opts.maxKB || 250;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const ov = el("div", "cvp-ov"), box = el("div", "cvp-box"), hd = el("div", "cvp-hd"), bd = el("div", "cvp-bd"), ft = el("div", "cvp-ft");
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    const tp = T.title.split(" / "), ttl = el("span", "cvp-ttl", "<b>" + tp[0] + "</b><small>" + tp[1] + "</small>"), xb = el("button", "cvp-x", I.x); xb.type = "button"; xb.setAttribute("aria-label", "close");
    hd.append(ttl, xb); box.append(hd, bd, ft); ov.appendChild(box); document.body.appendChild(ov);

    const fileIn = el("input"); fileIn.type = "file"; fileIn.accept = "image/*"; fileIn.style.display = "none";
    const camIn = el("input"); camIn.type = "file"; camIn.accept = "image/*"; camIn.setAttribute("capture", "user"); camIn.style.display = "none";
    ov.append(fileIn, camIn);

    // timers live here so close() can clear them
    let estTimer = null, cutTimer = null;

    // Stops the camera AND invalidates any camera request that is still starting.
    function stopStream() {
      S.camTok++;
      if (S.stream) { S.stream.getTracks().forEach(t => t.stop()); S.stream = null; }
    }
    function close(cancelled) {
      stopStream(); S.token++;
      clearTimeout(estTimer); clearTimeout(cutTimer);
      document.removeEventListener("keydown", onKey, true);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
      if (cancelled && opts.onCancel) opts.onCancel();
    }
    function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); close(true); } }
    document.addEventListener("keydown", onKey, true);
    xb.onclick = () => close(true);

    function setBody(nodes, footer, mode) {
      stopStream(); bd.innerHTML = ""; ft.innerHTML = ""; bd.scrollTop = 0;
      nodes.forEach(n => bd.appendChild(n)); (footer || []).forEach(n => ft.appendChild(n));
      ft.style.display = footer && footer.length ? "" : "none";
      box.classList.toggle("cvp-wide", mode === "wide"); ft.classList.toggle("cvp-cam", mode === "cam");
    }
    const btn = (label, cls, fn, icon) => { const b = el("button", "cvp-btn" + (cls ? " " + cls : ""), (icon || "") + (label ? '<span class="cvp-bt">' + lb(label) + "</span>" : "")); b.type = "button"; if (fn) b.onclick = fn; return b; };
    const ibtn = (icon, label, fn) => { const b = btn("", "cvp-ib", fn, icon); b.setAttribute("aria-label", label); b.title = label; return b; };
    const card = (icon, label, fn) => { const b = el("button", "cvp-card", '<span class="cvp-ic">' + icon + "</span><span>" + lb(label) + "</span>"); b.type = "button"; b.onclick = fn; return b; };
    const lab = t => el("div", "cvp-lab", lb(t));

    /* ---------- screen 1: choose a source ---------- */
    function showSource(msg) {
      const nodes = [];
      if (msg) nodes.push(el("div", "cvp-err", lb(msg)));
      const grid = el("div", "cvp-src"); grid.append(card(I.cam, T.camera, startCamera), card(I.img, T.gallery, () => fileIn.click()));
      nodes.push(grid, el("div", "cvp-tip", I.tip + "<span>" + lb(T.tips) + "</span>"), el("div", "cvp-priv", I.lock + "<span>" + lb(T.privacy) + "</span>"));
      setBody(nodes, []);
    }
    fileIn.onchange = () => { if (fileIn.files && fileIn.files[0]) useFile(fileIn.files[0]); fileIn.value = ""; };
    camIn.onchange = () => { if (camIn.files && camIn.files[0]) useFile(camIn.files[0]); camIn.value = ""; };

    /* ---------- screen 2: camera ---------- */
    async function startCamera() {
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || (global.isSecureContext === false)) { camFallback(); return; }
      const wrap = el("div", "cvp-vid"), video = el("video"), guide = el("div", "cvp-guide");
      video.setAttribute("playsinline", ""); video.muted = true; video.autoplay = true;
      const vw = Math.min(380, (global.innerWidth || 400) - 72), a = SIZES[S.aspectKey].a;
      const vh = Math.min(vw / a, (global.innerHeight || 700) * 0.5), vwf = vh * a;
      wrap.style.width = vwf + "px"; wrap.style.height = vh + "px";
      wrap.append(video, guide);
      const stage = el("div", "cvp-stage"); stage.append(wrap, el("div", "cvp-hint", lb(T.privacy)));
      const shutter = el("button", "cvp-shutter"); shutter.type = "button"; shutter.setAttribute("aria-label", T.capture); shutter.title = T.capture; shutter.onclick = capture;
      const sw = btn(T.switchCam, "", () => { S.facing = S.facing === "user" ? "environment" : "user"; startCamera(); }, I.swap);
      setBody([stage], [btn(T.back, "", () => showSource(), I.back), shutter, sw], "cam");
      const my = S.camTok;       // setBody() just bumped it; if it changes again, this request is stale
      try {
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: S.facing }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
        if (my !== S.camTok) { st.getTracks().forEach(t => t.stop()); return; }   // user went Back / closed / switched meanwhile → turn this camera off
        S.stream = st;
        video.srcObject = st; video.style.transform = S.facing === "user" ? "scaleX(-1)" : "";
        try { await video.play(); } catch (e) {}
      } catch (e) { if (my === S.camTok) camFallback(); }
      function capture() {
        if (!video.videoWidth) return;
        S.base = toBase(video, video.videoWidth, video.videoHeight, BASE_MAX);   // saved un-mirrored (true to life)
        stopStream(); startEdit();
      }
    }
    function camFallback() {
      const grid = el("div", "cvp-src"); grid.append(card(I.cam, T.camera, () => camIn.click()), card(I.img, T.gallery, () => fileIn.click()));
      setBody([el("div", "cvp-err", lb(T.camErr)), grid], [btn(T.back, "", () => showSource(), I.back)]);
    }

    /* ---------- load a file ---------- */
    async function useFile(file) {
      try { const img = await loadImage(file); S.base = toBase(img, img.naturalWidth || img.width, img.naturalHeight || img.height, BASE_MAX); startEdit(); }
      catch (e) { showSource(T.loadErr); }
    }

    /* ---------- screen 3: edit ---------- */
    let prev, pctx, info, status, zoomIn, cutBtn, tolRow, tolIn, aspBtns = {}, swBtns = [], customIn, custWrap, doneBtn;
    function rebuildOriented() { S.oriented = orient(S.base, S.rot, S.flip); S.cut = null; S.cx = S.oriented.width / 2; S.cy = S.oriented.height / 2; }
    function source() { return S.cut || S.oriented; }
    function cur() { return SIZES[S.aspectKey]; }
    function layoutPreview() {
      const a = cur().a, wide = (global.innerWidth || 400) >= 720;
      const pw = wide ? 340 : Math.min(380, (global.innerWidth || 400) - 72), maxH = (global.innerHeight || 700) * (wide ? 0.6 : 0.38);
      let fw = pw, fh = fw / a; if (fh > maxH) { fh = maxH; fw = fh * a; }
      S.fw = Math.round(fw); S.fh = Math.round(fh);
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      prev.width = Math.round(S.fw * dpr); prev.height = Math.round(S.fh * dpr);
      prev.style.width = S.fw + "px"; prev.style.height = S.fh + "px";
    }
    function rect() { const s = source(); const r = cropRect(s.width, s.height, cur().a, S.zoom, S.cx, S.cy); S.cx = r.x + r.w / 2; S.cy = r.y + r.h / 2; return r; }
    function render() {
      const r = rect();
      drawCrop(pctx, source(), r, prev.width, prev.height, S.bg);
      clearTimeout(estTimer); estTimer = setTimeout(estimate, 500);
    }
    function outSize() { const w = opts.outWidth || cur().w; return { w, h: Math.round(w / cur().a) }; }
    async function estimate() {
      const o = outSize(); info.textContent = o.w + "×" + o.h + " px";
      try {
        const c = makeCanvas(o.w, o.h); drawCrop(c.getContext("2d"), source(), rect(), o.w, o.h, S.bg);
        const type = S.bg === "transparent" ? (webpOK() ? "image/webp" : "image/png") : "image/jpeg";
        const b = await toBlob(c, type, 0.85);
        if (b) info.textContent = o.w + "×" + o.h + " px · ≈ " + Math.max(1, Math.round(b.size / 1024)) + " KB";
      } catch (e) {}
    }
    function setZoom(z) { S.zoom = clamp(z, 0.5, 4); zoomIn.value = String(Math.round(S.zoom * 100)); render(); }

    function applyCut() {
      clearTimeout(cutTimer); const my = ++S.token;
      if (!S.cutOn) { S.cut = null; status.textContent = ""; render(); return; }
      status.innerHTML = lb(T.working);
      cutTimer = setTimeout(() => {
        if (my !== S.token) return;
        const o = S.oriented, id = o.getContext("2d").getImageData(0, 0, o.width, o.height);
        const res = removeBackground(id, S.tol);
        const c = makeCanvas(o.width, o.height);
        const out = c.getContext("2d").createImageData(o.width, o.height); out.data.set(res.data.data); c.getContext("2d").putImageData(out, 0, 0);
        S.cut = c;
        status.innerHTML = res.ratio < 0.04 ? lb(T.noBg) : (res.ratio > 0.93 ? lb(T.allBg) : "");
        render();
      }, 30);
    }
    function pickBg(color) { S.bg = color; swBtns.forEach(b => b.classList.toggle("cvp-on", b.dataset.c === color)); if (custWrap) custWrap.classList.remove("cvp-on"); render(); }
    const darkBg = c => { const m = /^#(..)(..)(..)$/.exec(c); if (!m) return false; const v = m.slice(1).map(h => parseInt(h, 16)); return (v[0] * 299 + v[1] * 587 + v[2] * 114) / 1000 < 140; };
    const sec = (label, kids) => { const s = el("div", "cvp-sec"); s.append(lab(label)); kids.forEach(k => s.appendChild(k)); return s; };

    function startEdit() {
      S.rot = 0; S.flip = false; S.cutOn = false; S.zoom = 1; S.busy = false;
      rebuildOriented();
      prev = el("canvas", "cvp-prev"); pctx = prev.getContext("2d");
      info = el("span", "cvp-chip"); status = el("div", "cvp-status");
      layoutPreview();

      // stage: dark surface, live preview, face guide, drag/pinch gestures
      const frame = el("div", "cvp-frame"), guideEl = el("div", "cvp-guide"); frame.append(prev, guideEl);
      const gtog = el("button", "cvp-chip cvp-chipbtn", lb(T.guide)); gtog.type = "button"; gtog.setAttribute("aria-pressed", "true");
      gtog.onclick = () => { const on = gtog.getAttribute("aria-pressed") !== "true"; gtog.setAttribute("aria-pressed", String(on)); guideEl.style.display = on ? "" : "none"; };
      const chips = el("div", "cvp-chips"); chips.append(gtog, info);
      const stage = el("div", "cvp-stage"); stage.append(frame, chips, el("div", "cvp-hint", lb(T.hint)));
      const ptrs = new Map(); let d0 = 0, z0 = 1;
      const dist = () => { const p = [...ptrs.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1; };
      prev.addEventListener("pointerdown", e => { try { prev.setPointerCapture(e.pointerId); } catch (x) {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { d0 = dist(); z0 = S.zoom; } prev.style.cursor = "grabbing"; });
      prev.addEventListener("pointermove", e => {
        const p = ptrs.get(e.pointerId); if (!p) return;
        if (ptrs.size === 1) { const r = rect(); S.cx -= (e.clientX - p.x) * (r.w / S.fw); S.cy -= (e.clientY - p.y) * (r.h / S.fh); render(); }
        p.x = e.clientX; p.y = e.clientY;
        if (ptrs.size === 2) setZoom(z0 * dist() / d0);
      });
      const up = e => { ptrs.delete(e.pointerId); prev.style.cursor = "grab"; };
      prev.addEventListener("pointerup", up); prev.addEventListener("pointercancel", up); prev.addEventListener("pointerleave", up);
      prev.addEventListener("wheel", e => { e.preventDefault(); setZoom(S.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });

      const ctl = el("div", "cvp-ctl");

      // size presets, drawn as the actual frame shape
      if (aspects.length > 1) {
        const seg = el("div", "cvp-seg");
        aspects.forEach(k => {
          const b = el("button", k === S.aspectKey ? "cvp-on" : "", '<span class="cvp-ar"></span><span>' + SIZES[k].label + "</span>"); b.type = "button";
          b.firstChild.style.aspectRatio = String(SIZES[k].a);
          b.onclick = () => { S.aspectKey = k; Object.keys(aspBtns).forEach(x => aspBtns[x].classList.toggle("cvp-on", x === k)); layoutPreview(); render(); };
          aspBtns[k] = b; seg.appendChild(b);
        });
        ctl.appendChild(sec(T.size, [seg]));
      }

      // zoom + rotate / flip
      zoomIn = el("input"); zoomIn.type = "range"; zoomIn.min = "50"; zoomIn.max = "400"; zoomIn.value = "100"; zoomIn.setAttribute("aria-label", T.zoom);
      zoomIn.oninput = () => setZoom(zoomIn.value / 100);
      const zr = el("div", "cvp-tools"); zr.insertAdjacentHTML("beforeend", I.minus); zr.appendChild(zoomIn); zr.insertAdjacentHTML("beforeend", I.plus);
      const turn = d => { S.rot = (S.rot + d + 4) % 4; rebuildOriented(); if (S.cutOn) applyCut(); else render(); };
      const t3 = el("div", "cvp-tools cvp-t3");
      t3.append(btn(T.rotL, "", () => turn(-1), I.rotL), btn(T.rotR, "", () => turn(1), I.rotR), btn(T.flip, "", () => { S.flip = !S.flip; rebuildOriented(); if (S.cutOn) applyCut(); else render(); }, I.flip));
      ctl.appendChild(sec(T.adjust, [zr, t3]));

      // background colour
      const sws = el("div", "cvp-sws"); swBtns = [];
      SWATCHES.forEach(c => {
        const b = el("button", "cvp-sw" + (c === "transparent" ? " cvp-tr" : "") + (c === S.bg ? " cvp-on" : ""), I.checkB); b.type = "button"; b.dataset.c = c;
        if (c !== "transparent") b.style.background = c; b.style.color = darkBg(c) ? "#fff" : "#1c1b19";
        b.setAttribute("aria-label", c); b.onclick = () => pickBg(c); swBtns.push(b); sws.appendChild(b);
      });
      custWrap = el("label", "cvp-sw cvp-cust"); custWrap.title = T.custom;
      customIn = el("input"); customIn.type = "color"; customIn.setAttribute("aria-label", T.custom); customIn.value = /^#[0-9a-f]{6}$/i.test(S.bg) ? S.bg : "#ffffff";
      customIn.oninput = () => { S.bg = customIn.value; swBtns.forEach(b => b.classList.remove("cvp-on")); custWrap.classList.add("cvp-on"); custWrap.style.setProperty("--c", customIn.value); render(); };
      custWrap.appendChild(customIn); sws.appendChild(custWrap);
      ctl.appendChild(sec(T.bg, [sws]));

      // remove background (switch + strength)
      cutBtn = el("button", "cvp-rm-top", '<span class="cvp-ic">' + I.spark + '</span><span class="cvp-tx">' + lb(T.remove) + '</span><span class="cvp-switch"></span>');
      cutBtn.type = "button"; cutBtn.setAttribute("role", "switch"); cutBtn.setAttribute("aria-checked", "false");
      tolIn = el("input"); tolIn.type = "range"; tolIn.min = "5"; tolIn.max = "90"; tolIn.value = String(S.tol); tolIn.setAttribute("aria-label", T.strength);
      tolIn.oninput = () => { S.tol = +tolIn.value; applyCut(); };
      tolRow = el("div", "cvp-sec"); tolRow.style.display = "none"; const tr = el("div", "cvp-tools"); tr.appendChild(tolIn); tolRow.append(lab(T.strength), tr);
      cutBtn.onclick = () => { S.cutOn = !S.cutOn; cutBtn.setAttribute("aria-checked", String(S.cutOn)); tolRow.style.display = S.cutOn ? "" : "none"; applyCut(); };
      const rm = el("div", "cvp-rm"); rm.append(cutBtn, tolRow, status, el("div", "cvp-note", lb(T.removeHint)));
      ctl.appendChild(rm);

      const wrapEdit = el("div", "cvp-edit"); wrapEdit.append(stage, ctl);
      doneBtn = btn(T.done, "cvp-pri", finish, I.check);
      setBody([wrapEdit], [btn(T.again, "cvp-ghost", () => { S.cutOn = false; clearTimeout(cutTimer); S.token++; showSource(); }, I.cam.replace(/width="24" height="24"/, 'width="18" height="18"')), doneBtn], "wide");
      render();
    }

    async function finish() {
      if (S.busy) return;                       // already working → ignore a second click
      S.busy = true; if (doneBtn) doneBtn.disabled = true;
      const o = outSize(), c = makeCanvas(o.w, o.h);
      drawCrop(c.getContext("2d"), source(), rect(), o.w, o.h, S.bg);
      const type = S.bg === "transparent" ? (webpOK() ? "image/webp" : "image/png") : "image/jpeg";
      try {
        const r = await encode(c, type, maxKB), url = await readDataUrl(r.blob);
        const out = { width: r.canvas.width, height: r.canvas.height, kb: Math.round(r.blob.size / 1024), format: r.blob.type, blob: r.blob };
        close(false);
        if (opts.onDone) opts.onDone(url, out);
      } catch (e) {
        S.busy = false; if (doneBtn) doneBtn.disabled = false;
        status.innerHTML = lb(T.loadErr);
      }
    }

    /* ---------- start ---------- */
    if (opts.file) useFile(opts.file); else showSource();
    return { close: () => close(true) };
  }

  /* ------------------------------ plug into an existing <input type="file"> ------------------------------ */
  function setInputFile(input, blob, name) {
    const ext = blob.type === "image/png" ? "png" : (blob.type === "image/webp" ? "webp" : "jpg");
    const f = new File([blob], (name || "photo") + "." + ext, { type: blob.type });
    const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files;
    input.__cvpPass = true; input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function attach(input, opts) {
    if (!input || input.__cvpAttached) return;
    input.__cvpAttached = true; opts = opts || {};
    input.addEventListener("change", function (e) {
      if (input.__cvpPass) { input.__cvpPass = false; return; }          // the edited picture: let the site's own code see it
      const f = input.files && input.files[0]; if (!f) return;
      e.stopImmediatePropagation(); e.preventDefault();                  // the raw picture: edit it first
      open(Object.assign({}, opts, { file: f, onDone: (url, info) => { setInputFile(input, info.blob, "photo"); if (opts.onDone) opts.onDone(url, info); }, onCancel: () => { input.value = ""; if (opts.onCancel) opts.onCancel(); } }));
    }, true);
    if (opts.button !== false && input.parentNode) {
      const b = el("button", "cvp-btn", T.openBtn); b.type = "button"; b.style.margin = "6px 0";
      b.onclick = () => open(Object.assign({}, opts, { file: null, onDone: (url, info) => { setInputFile(input, info.blob, "photo"); if (opts.onDone) opts.onDone(url, info); } }));
      injectCss(); input.parentNode.insertBefore(b, input.nextSibling);
    }
  }

  global.CVPhoto = { open, attach, _core: { cropRect, drawCrop, orient, removeBackground, encode, toBase, makeCanvas, SIZES } };
})(typeof window !== "undefined" ? window : globalThis);
