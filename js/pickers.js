/* pickers.js — Template / mode / cover-letter / text-scale pickers */

// Template picker
document.querySelectorAll('.tpl-swatch').forEach(el=>{
  el.addEventListener('click', ()=>{
    document.querySelectorAll('.tpl-swatch').forEach(s=>s.classList.remove('active'));
    el.classList.add('active');
    state.tpl = el.dataset.tpl;
    render();
  });
});
// Cover Letter: hidden as a subtle "tip" toggle at the end of the Template section,
// plus small tabs above the preview so switching back and forth is always easy.
function applyModeVisibility(){
  const isCL = state.mode === 'cl';
  document.querySelectorAll('.cv-only').forEach(el => el.style.display = isCL ? 'none' : '');
  if($('clDetails').open !== isCL) $('clDetails').open = isCL;
  $('previewTabCv').classList.toggle('active', !isCL);
  $('previewTabCl').classList.toggle('active', isCL);
}
function switchToMode(mode){
  const wantOpen = mode === 'cl';
  if($('clDetails').open !== wantOpen){
    $('clDetails').open = wantOpen; // fires the 'toggle' handler below, which sets state.mode + renders
  }
}
$('clDetails').addEventListener('toggle', ()=>{
  state.mode = $('clDetails').open ? 'cl' : 'cv';
  applyModeVisibility();
  render();
});
$('previewTabCv').addEventListener('click', ()=> switchToMode('cv'));
$('previewTabCl').addEventListener('click', ()=> switchToMode('cl'));

// Cover letter template picker
document.querySelectorAll('#clTemplatePicker [data-cltpl]').forEach(el=>{
  el.addEventListener('click', ()=>{
    document.querySelectorAll('#clTemplatePicker [data-cltpl]').forEach(s=>s.classList.remove('active'));
    el.classList.add('active');
    state.clTpl = el.dataset.cltpl;
    render();
  });
});

// Scale picker
document.querySelectorAll('.scale-btn').forEach(el=>{
  el.addEventListener('click', ()=>{
    document.querySelectorAll('.scale-btn').forEach(s=>s.classList.remove('active'));
    el.classList.add('active');
    state.scale = parseFloat(el.dataset.scale);
    render();
  });
});
