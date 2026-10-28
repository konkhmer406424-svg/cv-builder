/* layout.js — Resizable panels, phone preview fit, Edit/Preview tabs */

const resizer = $('resizer');
const appEl = document.querySelector('.app');
const isPhoneLayout = () => window.matchMedia('(max-width:900px)').matches;
if(resizer && appEl){
  let dragging = false;
  const limits = () => isPhoneLayout()
    ? { min: 110, max: Math.max(160, window.innerWidth - 110) }
    : { min: 280, max: 700 };
  resizer.addEventListener('mousedown', (e)=>{
    dragging = true;
    resizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e)=>{
    if(!dragging) return;
    const L = limits(); const w = Math.min(L.max, Math.max(L.min, e.clientX));
    appEl.style.setProperty('--editor-w', w + 'px');
  });
  window.addEventListener('mouseup', ()=>{
    if(!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.style.userSelect = '';
  });
  // touch support
  resizer.addEventListener('touchstart', (e)=>{
    dragging = true;
    resizer.classList.add('dragging');
  }, {passive:true});
  window.addEventListener('touchmove', (e)=>{
    if(!dragging) return;
    const x = e.touches[0].clientX;
    const L = limits(); const w = Math.min(L.max, Math.max(L.min, x));
    appEl.style.setProperty('--editor-w', w + 'px');
  }, {passive:true});
  window.addEventListener('touchend', ()=>{
    dragging = false;
    resizer.classList.remove('dragging');
  });
}

// ---- Phone layout: shrink the A4 preview to fit the right-hand column ----
let _fitRaf = 0, _lastFit = '';
function fitPreview(){
  if(_fitRaf) return;
  _fitRaf = requestAnimationFrame(()=>{
    _fitRaf = 0;
    const wrap = document.querySelector('.preview-wrap');
    const col = document.querySelector('.preview-col');
    if(!wrap || !col) return;
    if(!isPhoneLayout()){
      if(_lastFit){ col.style.removeProperty('--fit'); _lastFit = ''; }
      return;
    }
    const cs = getComputedStyle(wrap);
    const avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if(avail <= 0) return; // preview tab hidden
    const v = Math.max(0.15, avail / 794).toFixed(3);
    if(v !== _lastFit){ _lastFit = v; col.style.setProperty('--fit', v); }
  });
}
window.addEventListener('resize', fitPreview);
window.addEventListener('orientationchange', fitPreview);
if(window.ResizeObserver){ new ResizeObserver(fitPreview).observe(document.querySelector('.preview-wrap')); }

// ---- Phone: Edit / Preview tabs ----
function setMobileView(v){
  document.body.classList.toggle('show-edit', v==='edit');
  document.body.classList.toggle('show-preview', v==='preview');
  $('mTabEdit').classList.toggle('active', v==='edit');
  $('mTabPreview').classList.toggle('active', v==='preview');
  window.scrollTo(0,0);
  if(v==='preview') fitPreview();
}
$('mTabEdit').addEventListener('click', ()=>setMobileView('edit'));
$('mTabPreview').addEventListener('click', ()=>setMobileView('preview'));
