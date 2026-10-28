# CV Builder — file map

index.html            markup only (no CSS/JS inside)
assets/logo.png       logo (was inlined as base64)
assets/icons/         app icons (192, 512, maskable, apple-touch, favicon)
manifest.webmanifest  app name, colours, icons (install as app)
sw.js                 offline cache; add new files to PRECACHE and bump CACHE

css/  (load order matters — same order as the old single <style>)
  base.css            colours, page grid, editor panel, form controls
  preview.css         preview column, cover-letter styles, print watermark, shared photo
  templates-en.css    CV templates 1–15
  templates-kh.css    CV templates 16–20 (Khmer)
  responsive.css      phone / tablet layout
  components.css      photo button, AI helper bar

js/  (classic scripts, load order matters — all share global variables)
  cv-photo.js         camera / crop / background tool
  config.js           URLs + storage keys  <-- edit Worker / Apps Script URL here
  core.js             state, $ helper, text + date helpers
  ai.js               AI helper bar
  inputs.js           basic inputs, language notes
  photo.js            photo button glue
  pickers.js          template / mode / cover-letter / scale pickers
  entries.js          experience, education, references, custom sections
  letter.js           cover letter
  render.js           CV preview (all templates)
  storage.js          save / load / clear
  unlock.js           payment gate: unlock check
  download.js         download choice, pay modal, print watermark
  khqr.js             KHQR create / poll / manual code
  layout.js           resizer, phone preview fit, tabs
  main.js             start-up
  pwa.js              registers sw.js
