/* photo.js — Photo button glue (editor itself is cv-photo.js) */

// ---- Photo (camera / crop / background — cv-photo.js) ----
function setPhoto(url){ state.photo = url; updatePhotoThumb(); render(); }
function openPhotoEditor(){
  if(window.CVPhoto){
    // Local (t1) and Classic (t10) use a 3x4 box; the other templates use a square/round photo.
    const portrait = (state.tpl === 't1' || state.tpl === 't10');
    CVPhoto.open({ aspect: portrait ? '3x4' : '1x1', maxKB: 250, onDone: url => setPhoto(url) });
    return;
  }
  // Fallback if cv-photo.js did not load: plain file picker (original behaviour)
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => { const f = inp.files[0]; if(!f) return; const r = new FileReader(); r.onload = ev => setPhoto(ev.target.result); r.readAsDataURL(f); };
  inp.click();
}
$('photoBtn').addEventListener('click', openPhotoEditor);
$('removePhoto').addEventListener('click', ()=>{ setPhoto(null); });
function updatePhotoThumb(){
  const t = $('photoThumb');
  if(state.photo){
    const img = document.createElement('img');
    img.className = 'photo-thumb'; img.id = 'photoThumb'; img.alt = 'thumb'; img.src = state.photo;
    t.replaceWith(img);
  } else if(t.tagName === 'IMG'){
    const d = document.createElement('div');
    d.className = 'photo-thumb-empty'; d.id = 'photoThumb'; d.textContent = 'No photo';
    t.replaceWith(d);
  }
  $('removePhoto').style.display = state.photo ? 'block' : 'none';
}
