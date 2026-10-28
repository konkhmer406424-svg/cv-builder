/* inputs.js — Basic form inputs + language reminder notes */

// ---- Language reminder on every input section (EN for templates 1–15, KH for 16–20) ----
const LANG_NOTE = {
  en: '⚠️ សូមបញ្ចូលព័ត៌មានជាភាសាអង់គ្លេស / Please enter this information in English (Templates 1–15).',
  km: '⚠️ សូមបញ្ចូលព័ត៌មានជាភាសាខ្មែរ / Please enter this information in Khmer (Templates 16–20).'
};
let langNoteMode = '';
function makeLangNote(){ const d = document.createElement('div'); d.className = 'lang-note'; return d; }
document.querySelectorAll('.acc-item[data-acc]:not([data-acc="photo"]) > .acc-body').forEach(body => body.insertBefore(makeLangNote(), body.firstChild));
try{ const c = $('clCompany'); const lab = c.previousElementSibling; c.parentElement.insertBefore(makeLangNote(), lab || c); }catch(e){}
function applyLangMode(){
  const m = langMode();
  if(m === langNoteMode) return;
  langNoteMode = m;
  document.body.dataset.langMode = m;
  document.querySelectorAll('.lang-note').forEach(n => { n.textContent = LANG_NOTE[m]; n.className = 'lang-note ' + m; });
}
applyLangMode();

function bindBasic(id, key){
  $(id).addEventListener('input', e => { state[key] = e.target.value; render(); });
}
['fullName','jobTitle','email','phone','location','linkedin'].forEach(k => bindBasic(k,k));
['clCompany','clHiringManager','clPosition','clDate','clHighlight'].forEach(k => bindBasic(k,k));
$('summary').addEventListener('input', e => { state.summary = e.target.value; render(); });
$('skills').addEventListener('input', e => { state.skills = e.target.value; render(); });
$('languages').addEventListener('input', e => { state.languages = e.target.value; render(); });
$('certifications').addEventListener('input', e => { state.certifications = e.target.value; render(); });
$('interests').addEventListener('input', e => { state.interests = e.target.value; render(); });
