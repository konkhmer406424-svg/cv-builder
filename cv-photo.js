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
    pick: "ជ្រើសរើសរូបថត / Choose a photo",
    camera: "📷 ថតភ្លាមៗ / Take a photo",
    gallery: "🖼️ ជ្រើសពីឧបករណ៍ / Choose from device",
    capture: "ថត / Capture",
    switchCam: "🔄 ប្តូរកាមេរ៉ា / Switch camera",
    back: "← ត្រឡប់ / Back",
    zoom: "ពង្រីក / Zoom",
    rotL: "↺", rotR: "↻", flip: "⇋",
    size: "ទំហំ / Size",
    bg: "ផ្ទៃខាងក្រោយ / Background",
    remove: "✨ ដកផ្ទៃខាងក្រោយ / Remove background",
    removeOn: "✨ ដកផ្ទៃខាងក្រោយ / Remove background  ✓",
    strength: "កម្រិតដក / Strength",
    removeHint: "ល្អបំផុតពេលផ្ទៃខាងក្រោយមានពណ៌តែមួយ (ជញ្ជាំងស...) / Works best on a plain background",
    working: "កំពុងដំណើរការ… / Working…",
    noBg: "រកមិនឃើញផ្ទៃខាងក្រោយ — សាកកើនកម្រិត / Background not found — raise the strength",
    allBg: "ដកច្រើនពេក — សាកបន្ថយកម្រិត / Removed too much — lower the strength",
    done: "✓ ប្រើរូបនេះ / Use this photo",
    cancel: "បោះបង់ / Cancel",
    again: "ថត/ជ្រើសម្តងទៀត / Retake",
    privacy: "កែក្នុងឧបករណ៍របស់អ្នក មិនបញ្ជូនរូបទៅកន្លែងណាទេ / Edited on your device — nothing is uploaded",
    camErr: "មិនអាចបើកកាមេរ៉ា។ សូមអនុញ្ញាតកាមេរ៉ា ឬជ្រើសរូបពីឧបករណ៍ / Cannot open the camera. Allow camera access or choose a photo.",
    loadErr: "មិនអាចបើករូបនេះ / Cannot open this picture",
    openBtn: "📷 ថត / កែរូប  Take / Edit photo",
    custom: "ពណ៌ផ្សេង / Custom colour"
  };

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
.cvp-ov{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:8px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Khmer",sans-serif}
.cvp-box{background:#fff;color:#1f2937;border-radius:14px;width:100%;max-width:440px;max-height:calc(100vh - 16px);overflow:auto;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.35)}
.cvp-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:600}
.cvp-x{border:0;background:none;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;color:#6b7280}
.cvp-bd{padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.cvp-btn{border:1px solid #d1d5db;background:#f9fafb;border-radius:10px;padding:10px 12px;font-size:14px;cursor:pointer;color:#1f2937;font-family:inherit}
.cvp-btn:hover{background:#f3f4f6}
.cvp-btn.cvp-pri{background:#2563eb;border-color:#2563eb;color:#fff;font-weight:600}
.cvp-btn.cvp-on{background:#dbeafe;border-color:#2563eb}
.cvp-btn.cvp-big{padding:16px 12px;font-size:16px}
.cvp-btn:disabled{opacity:.6;cursor:default}
.cvp-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cvp-row>label{font-size:13px;color:#4b5563;min-width:92px}
.cvp-row input[type=range]{flex:1;min-width:120px}
.cvp-prev{align-self:center;border-radius:8px;touch-action:none;cursor:grab;background-color:#fff;background-image:linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%);background-size:14px 14px;background-position:0 0,0 7px,7px -7px,-7px 0;box-shadow:0 0 0 1px #d1d5db}
.cvp-sw{width:30px;height:30px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #9ca3af;cursor:pointer;padding:0}
.cvp-sw.cvp-on{box-shadow:0 0 0 3px #2563eb}
.cvp-sw.cvp-tr{background-color:#fff;background-image:linear-gradient(45deg,#bbb 25%,transparent 25%,transparent 75%,#bbb 75%),linear-gradient(45deg,#bbb 25%,transparent 25%,transparent 75%,#bbb 75%);background-size:10px 10px;background-position:0 0,5px 5px}
.cvp-note{font-size:12px;color:#6b7280}
.cvp-err{font-size:13px;color:#b91c1c;background:#fef2f2;border-radius:8px;padding:8px 10px}
.cvp-vid{position:relative;align-self:center;background:#000;border-radius:10px;overflow:hidden}
.cvp-vid video{width:100%;height:100%;object-fit:cover;display:block}
.cvp-guide{position:absolute;inset:8% 14%;border:2px dashed rgba(255,255,255,.85);border-radius:48% 48% 40% 40%/42% 42% 30% 30%;pointer-events:none}
.cvp-ft{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding:10px 14px;border-top:1px solid #e5e7eb}
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
    const ttl = el("span", null, T.title), xb = el("button", "cvp-x", "×"); xb.type = "button"; xb.setAttribute("aria-label", "close");
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

    function setBody(nodes, footer) { stopStream(); bd.innerHTML = ""; ft.innerHTML = ""; nodes.forEach(n => bd.appendChild(n)); (footer || []).forEach(n => ft.appendChild(n)); ft.style.display = footer && footer.length ? "" : "none"; }
    const btn = (label, cls, fn) => { const b = el("button", "cvp-btn" + (cls ? " " + cls : ""), label); b.type = "button"; if (fn) b.onclick = fn; return b; };

    /* ---------- screen 1: choose a source ---------- */
    function showSource(msg) {
      const nodes = [el("div", "cvp-note", T.pick)];
      if (msg) nodes.push(el("div", "cvp-err", msg));
      nodes.push(btn(T.camera, "cvp-big", startCamera), btn(T.gallery, "cvp-big", () => fileIn.click()), el("div", "cvp-note", T.privacy));
      setBody(nodes, [btn(T.cancel, "", () => close(true))]);
    }
    fileIn.onchange = () => { if (fileIn.files && fileIn.files[0]) useFile(fileIn.files[0]); fileIn.value = ""; };
    camIn.onchange = () => { if (camIn.files && camIn.files[0]) useFile(camIn.files[0]); camIn.value = ""; };

    /* ---------- screen 2: camera ---------- */
    async function startCamera() {
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || (global.isSecureContext === false)) { camFallback(); return; }
      const wrap = el("div", "cvp-vid"), video = el("video"), guide = el("div", "cvp-guide");
      video.setAttribute("playsinline", ""); video.muted = true; video.autoplay = true;
      const vw = Math.min(380, (global.innerWidth || 400) - 56), a = SIZES[S.aspectKey].a;
      const vh = Math.min(vw / a, (global.innerHeight || 700) * 0.55), vwf = vh * a;
      wrap.style.width = vwf + "px"; wrap.style.height = vh + "px";
      wrap.append(video, guide);
      const snap = btn(T.capture, "cvp-pri cvp-big", capture), sw = btn(T.switchCam, "", () => { S.facing = S.facing === "user" ? "environment" : "user"; startCamera(); });
      setBody([wrap, el("div", "cvp-note", T.privacy)], [btn(T.back, "", () => showSource()), sw, snap]);
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
      const nodes = [el("div", "cvp-err", T.camErr), btn(T.camera.replace("📷", "📱"), "cvp-big", () => camIn.click()), btn(T.gallery, "cvp-big", () => fileIn.click())];
      setBody(nodes, [btn(T.back, "", () => showSource())]);
    }

    /* ---------- load a file ---------- */
    async function useFile(file) {
      try { const img = await loadImage(file); S.base = toBase(img, img.naturalWidth || img.width, img.naturalHeight || img.height, BASE_MAX); startEdit(); }
      catch (e) { showSource(T.loadErr); }
    }

    /* ---------- screen 3: edit ---------- */
    let prev, pctx, info, status, zoomIn, cutBtn, tolRow, tolIn, aspBtns = {}, swBtns = [], customIn, doneBtn;
    function rebuildOriented() { S.oriented = orient(S.base, S.rot, S.flip); S.cut = null; S.cx = S.oriented.width / 2; S.cy = S.oriented.height / 2; }
    function source() { return S.cut || S.oriented; }
    function cur() { return SIZES[S.aspectKey]; }
    function layoutPreview() {
      const a = cur().a, pw = Math.min(380, (global.innerWidth || 400) - 56), maxH = (global.innerHeight || 700) * 0.46;
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
      status.textContent = T.working;
      cutTimer = setTimeout(() => {
        if (my !== S.token) return;
        const o = S.oriented, id = o.getContext("2d").getImageData(0, 0, o.width, o.height);
        const res = removeBackground(id, S.tol);
        const c = makeCanvas(o.width, o.height);
        const out = c.getContext("2d").createImageData(o.width, o.height); out.data.set(res.data.data); c.getContext("2d").putImageData(out, 0, 0);
        S.cut = c;
        status.textContent = res.ratio < 0.04 ? T.noBg : (res.ratio > 0.93 ? T.allBg : "");
        render();
      }, 30);
    }
    function pickBg(color) { S.bg = color; swBtns.forEach(b => b.classList.toggle("cvp-on", b.dataset.c === color)); render(); }

    function startEdit() {
      S.rot = 0; S.flip = false; S.cutOn = false; S.zoom = 1; S.busy = false;
      rebuildOriented();
      prev = el("canvas", "cvp-prev"); pctx = prev.getContext("2d");
      info = el("div", "cvp-note"); status = el("div", "cvp-note");
      const nodes = [];
      // preview + gestures
      layoutPreview(); nodes.push(prev);
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

      // zoom / rotate / flip
      const rz = el("div", "cvp-row"), zl = el("label", null, T.zoom); zoomIn = el("input"); zoomIn.type = "range"; zoomIn.min = "50"; zoomIn.max = "400"; zoomIn.value = "100";
      zoomIn.oninput = () => setZoom(zoomIn.value / 100);
      const turn = d => { S.rot = (S.rot + d + 4) % 4; rebuildOriented(); if (S.cutOn) applyCut(); else render(); };
      rz.append(zl, zoomIn, btn(T.rotL, "", () => turn(-1)), btn(T.rotR, "", () => turn(1)), btn(T.flip, "", () => { S.flip = !S.flip; rebuildOriented(); if (S.cutOn) applyCut(); else render(); }));
      nodes.push(rz);

      // size presets
      if (aspects.length > 1) {
        const ra = el("div", "cvp-row"); ra.append(el("label", null, T.size));
        aspects.forEach(k => { const b = btn(SIZES[k].label, k === S.aspectKey ? "cvp-on" : "", () => { S.aspectKey = k; Object.keys(aspBtns).forEach(x => aspBtns[x].classList.toggle("cvp-on", x === k)); layoutPreview(); render(); }); aspBtns[k] = b; ra.appendChild(b); });
        nodes.push(ra);
      }

      // background colour
      const rb = el("div", "cvp-row"); rb.append(el("label", null, T.bg)); swBtns = [];
      SWATCHES.forEach(c => { const b = el("button", "cvp-sw" + (c === "transparent" ? " cvp-tr" : "") + (c === S.bg ? " cvp-on" : "")); b.type = "button"; b.dataset.c = c; if (c !== "transparent") b.style.background = c; b.setAttribute("aria-label", c); b.onclick = () => pickBg(c); swBtns.push(b); rb.appendChild(b); });
      customIn = el("input"); customIn.type = "color"; customIn.title = T.custom; customIn.value = /^#[0-9a-f]{6}$/i.test(S.bg) ? S.bg : "#ffffff"; customIn.style.cssText = "width:34px;height:30px;border:0;padding:0;background:none;cursor:pointer";
      customIn.oninput = () => { S.bg = customIn.value; swBtns.forEach(b => b.classList.remove("cvp-on")); render(); };
      rb.appendChild(customIn); nodes.push(rb);

      // remove background
      cutBtn = btn(T.remove, "", () => { S.cutOn = !S.cutOn; cutBtn.textContent = S.cutOn ? T.removeOn : T.remove; cutBtn.classList.toggle("cvp-on", S.cutOn); tolRow.style.display = S.cutOn ? "" : "none"; applyCut(); });
      tolRow = el("div", "cvp-row"); tolRow.style.display = "none"; tolIn = el("input"); tolIn.type = "range"; tolIn.min = "5"; tolIn.max = "90"; tolIn.value = String(S.tol);
      tolIn.oninput = () => { S.tol = +tolIn.value; applyCut(); }; tolRow.append(el("label", null, T.strength), tolIn);
      nodes.push(cutBtn, tolRow, status, el("div", "cvp-note", T.removeHint), info);

      doneBtn = btn(T.done, "cvp-pri", finish);
      setBody(nodes, [btn(T.again, "", () => { S.cutOn = false; clearTimeout(cutTimer); S.token++; showSource(); }), btn(T.cancel, "", () => close(true)), doneBtn]);
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
        status.textContent = T.loadErr;
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
