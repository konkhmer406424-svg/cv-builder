/* coach.js — CV Check (free, no AI) + AI: questions to improve + AI: interview preparation.
   Needs: core.js ($, state), ai.js (AI_ERRORS, langMode), unlock.js (isUnlocked, readUnlock, showPayModal), config.js (AI_URL). */

const COACH_MAX_CV_CHARS = 5000;   // must be <= MAX_INPUT_LONG in the Worker
const KH_RE = /[\u1780-\u17FF]/g, LATIN_RE = /[A-Za-z]/g;

function coachCvText(){
  // Contact details (name, email, phone, address, links) are NOT sent to the AI.
  const s = state, out = [];
  if(s.jobTitle) out.push('Job title: ' + s.jobTitle);
  if(s.summary) out.push('Summary: ' + s.summary);
  const exp = s.exp.filter(x => x.role || x.company);
  if(exp.length){
    out.push('Experience:');
    exp.forEach(x => {
      const when = x.startDate ? ` (${x.startDate} – ${x.current ? 'Present' : (x.endDate || '?')})` : '';
      out.push(`- ${x.role || '?'} at ${x.company || '?'}${when}`);
      (x.desc || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(l => out.push('  * ' + l));
    });
  }
  const edu = s.edu.filter(x => x.degree || x.school);
  if(edu.length){ out.push('Education:'); edu.forEach(x => out.push(`- ${x.degree || '?'}, ${x.school || '?'} ${x.dates || ''}`.trim())); }
  if(s.skills) out.push('Skills: ' + s.skills);
  if(s.languages) out.push('Languages: ' + s.languages);
  if(s.certifications) out.push('Certifications: ' + s.certifications);
  return out.join('\n').slice(0, COACH_MAX_CV_CHARS);
}

// ---------- 1) CV check: rules only, instant, free ----------
function coachCheck(){
  const s = state, items = [];
  const must = (km, en, acc, focus) => items.push({lvl:'must', msg: km + ' / ' + en, acc, focus});
  const tip  = (km, en, acc, focus) => items.push({lvl:'tip',  msg: km + ' / ' + en, acc, focus});

  if(!s.fullName.trim()) must('សូមបញ្ចូលឈ្មោះពេញ', 'Add your full name', 'basic', 'fullName');
  if(!s.jobTitle.trim()) must('សូមបញ្ចូលតួនាទីការងារ', 'Add a job title', 'basic', 'jobTitle');
  if(!s.email.trim())    must('គ្មានអ៊ីមែល', 'No email address', 'basic', 'email');
  if(!s.phone.trim())    must('គ្មានលេខទូរស័ព្ទ', 'No phone number', 'basic', 'phone');

  const sum = s.summary.trim();
  if(!sum) tip('គ្មានសេចក្តីសង្ខេប (២–៣ ប្រយោគ)', 'No summary (2–3 sentences)', 'basic', 'summary');
  else if(sum.length < 40) tip('សេចក្តីសង្ខេបខ្លីពេក', 'Summary is very short', 'basic', 'summary');
  else if(sum.length > 500) tip('សេចក្តីសង្ខេបវែងពេក (គួរក្រោម ៥០០ តួអក្សរ)', 'Summary is too long (keep it under 500 characters)', 'basic', 'summary');

  const exp = s.exp.filter(x => x.role || x.company);
  if(!exp.length){
    tip('មិនទាន់មានបទពិសោធន៍ — និស្សិតថ្មីអាចបន្ថែមកម្មសិក្សា ឬការងារស្ម័គ្រចិត្ត', 'No experience yet — fresh graduates can add internships or volunteering', 'exp');
  }
  let anyDigits = false, anyDesc = false;
  exp.forEach((x, i) => {
    const n = '#' + (i + 1) + ' ' + (x.role || x.company);
    if(!x.role)    must(`បទពិសោធន៍ ${n}៖ ខ្វះតួនាទី`, `Experience ${n}: role missing`, 'exp');
    if(!x.company) must(`បទពិសោធន៍ ${n}៖ ខ្វះឈ្មោះក្រុមហ៊ុន`, `Experience ${n}: company missing`, 'exp');
    if(!x.startDate) must(`បទពិសោធន៍ ${n}៖ ខ្វះកាលបរិច្ឆេទចាប់ផ្តើម`, `Experience ${n}: start date missing`, 'exp');
    else if(!x.current && !x.endDate) must(`បទពិសោធន៍ ${n}៖ ខ្វះកាលបរិច្ឆេទបញ្ចប់ (ឬធីក «បច្ចុប្បន្ន»)`, `Experience ${n}: end date missing (or tick "current")`, 'exp');
    const lines = (x.desc || '').split('\n').map(l => l.trim()).filter(Boolean);
    if(!lines.length) must(`បទពិសោធន៍ ${n}៖ ខ្វះការពិពណ៌នាការងារ`, `Experience ${n}: no description`, 'exp');
    else {
      anyDesc = true;
      if(lines.length < 2) tip(`បទពិសោធន៍ ${n}៖ សរសេរយ៉ាងហោចណាស់ ២–៣ ចំណុច`, `Experience ${n}: write at least 2–3 bullet points`, 'exp');
      if(lines.some(l => /^(responsible for|duties (include|included)|worked on|helped with|in charge of)\b/i.test(l)))
        tip(`បទពិសោធន៍ ${n}៖ ប្រើពាក្យចាប់ផ្តើមខ្សោយ — សាកប៊ូតុង «កែសម្រួល / Improve»`, `Experience ${n}: weak sentence openings — try the Improve button`, 'exp');
      if(lines.some(l => /\d/.test(l))) anyDigits = true;
    }
  });
  if(anyDesc && !anyDigits) tip('គ្មានលេខសោះ — បន្ថែមលេខពិត (ចំនួនអតិថិជន % កំណើន ឆ្នាំ) ប្រសិនបើមាន', 'No numbers anywhere — add real numbers (customers, % growth, years) if you have them', 'exp');

  if(!s.edu.some(x => x.degree || x.school)) tip('គ្មានការសិក្សា', 'No education listed', 'edu');
  const nSkills = s.skills.split(',').map(x => x.trim()).filter(Boolean).length;
  if(nSkills < 3) tip('ជំនាញតិចពេក (គួរមាន ៥–៨)', 'Few skills listed (aim for 5–8)', 'skills', 'skills');
  if(!s.languages.trim()) tip('គ្មានភាសា', 'No languages listed', 'languages', 'languages');
  const photoTpls = ['t1','t16','t17','t18','t19','t20'];
  if(!s.photo && photoTpls.includes(s.tpl)) tip('ទម្រង់នេះគួរមានរូបថត', 'This template normally has a photo', 'photo');

  // Language mismatch between template and text (templates 1–15 = English, 16–20 = Khmer)
  const body = [s.jobTitle, s.summary, ...exp.map(x => x.desc)].join(' ');
  const kh = (body.match(KH_RE) || []).length, la = (body.match(LATIN_RE) || []).length, tot = kh + la;
  if(tot > 40){
    if(langMode() === 'en' && kh / tot > 0.3) tip('ទម្រង់នេះជាភាសាអង់គ្លេស តែអត្ថបទភាគច្រើនជាខ្មែរ — សាកប៊ូតុង «ខ្មែរ → English»', 'This is an English template but most text is Khmer — try the Khmer → English button', 'exp');
    if(langMode() === 'km' && la / tot > 0.5) tip('ទម្រង់នេះជាភាសាខ្មែរ តែអត្ថបទភាគច្រើនជាអង់គ្លេស — សាកប៊ូតុង «English → ខ្មែរ»', 'This is a Khmer template but most text is English — try the English → Khmer button', 'exp');
  }
  return items;
}

function coachGoto(acc, focusId){
  const item = document.querySelector('.acc-item[data-acc="' + acc + '"]');
  if(item) item.classList.add('open');
  const el = focusId ? $(focusId) : null;
  if(el){ el.scrollIntoView({block:'center', behavior:'smooth'}); try{ el.focus({preventScroll:true}); }catch(e){} }
  else if(item) item.scrollIntoView({block:'start', behavior:'smooth'});
}

// ---------- UI: result card under the action row ----------
const COACH_BTNS = ['coachCheckBtn','coachGapsBtn','coachInterviewBtn'];
function coachOpen(title, activeId){
  $('coachCard').style.display = 'block';
  $('coachCardTitle').textContent = title;
  $('coachCheckOut').textContent = '';
  $('coachText').style.display = 'none'; $('coachText').textContent = '';
  $('coachCopyBtn').style.display = 'none';
  $('coachHint').style.display = 'none';
  $('coachMsg').className = 'ai-msg'; $('coachMsg').textContent = '';
  COACH_BTNS.forEach(id => $(id).classList.toggle('on', id === activeId));
  try{ $('coachCard').scrollIntoView({block:'nearest', behavior:'smooth'}); }catch(e){}
}
function coachClose(){
  $('coachCard').style.display = 'none';
  COACH_BTNS.forEach(id => $(id).classList.remove('on'));
}
function coachShowCheck(){
  coachOpen('ពិនិត្យ CV / CV check', 'coachCheckBtn');
  const out = $('coachCheckOut');
  const items = coachCheck();
  const must = items.filter(i => i.lvl === 'must'), tips = items.filter(i => i.lvl === 'tip');
  const head = document.createElement('div'); head.className = 'coach-head';
  head.textContent = items.length
    ? `⚠️ ${must.length} ត្រូវបំពេញ / to fix · 💡 ${tips.length} គន្លឹះ / tips`
    : '✅ CV របស់អ្នកមើលទៅគ្រប់គ្រាន់ / Your CV looks complete';
  out.appendChild(head);
  items.forEach(i => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'coach-item ' + i.lvl;
    b.textContent = (i.lvl === 'must' ? '⚠️ ' : '💡 ') + i.msg;
    b.addEventListener('click', () => coachGoto(i.acc, i.focus));
    out.appendChild(b);
  });
}

// ---------- 2) AI calls (need Unlock, count towards the daily + total limit) ----------
async function coachAi(action, extra){
  if(coachCvText().length < 40) return {error:'cv_empty'};
  if(!isUnlocked()){ showPayModal(); return {error:'unlock_required'}; }
  const d = readUnlock();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 60000);
  try{
    const res = await fetch(AI_URL, {
      method:'POST', signal: ctl.signal, headers:{'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({code: d.code, fullName: d.name, action, text: coachCvText()}, extra))
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || !data.text){ if(data.error === 'unlock_required') showPayModal(); return {error: data.error || 'unknown', status: data.status}; }
    return {text: data.text, remaining: data.remaining};
  }catch(e){ return {error:'network'}; }
  finally{ clearTimeout(timer); }
}
function coachErr(code, status){
  if(code === 'cv_empty') return 'សូមបំពេញ CV បន្តិចជាមុន (បទពិសោធន៍ ឬសេចក្តីសង្ខេប) / Fill in some of your CV first (experience or summary)';
  if(code === 'network') return 'មានបញ្ហាតភ្ជាប់ / Connection error';
  return ((typeof AI_ERRORS !== 'undefined' && AI_ERRORS[code]) || 'មានបញ្ហា / Something went wrong') + (status ? ' [HTTP ' + status + ']' : '');
}
async function coachRun(btnId, action, extra, title){
  coachOpen(title, btnId);
  $('coachHint').style.display = '';
  const msg = $('coachMsg'), btns = COACH_BTNS.map($);
  btns.forEach(b => b.disabled = true);
  msg.textContent = 'កំពុងដំណើរការ… / Working…';
  const r = await coachAi(action, extra);
  btns.forEach(b => b.disabled = false);
  if(r.error){ msg.className = 'ai-msg err'; msg.textContent = coachErr(r.error, r.status); return; }
  $('coachText').textContent = r.text;             // textContent: AI output is never inserted as HTML
  $('coachText').style.display = 'block';
  $('coachCopyBtn').style.display = '';
  msg.textContent = (typeof r.remaining === 'number') ? `នៅសល់ ${r.remaining} ដង AI / ${r.remaining} AI uses left` : '';
}

// ---------- Language toggle (Khmer on top / English below; click to switch) ----------
let coachLang = null, coachLangManual = false;
function coachLangNow(){ return coachLang || langMode(); }
function coachSyncLang(){
  if(!coachLangManual) coachLang = langMode();     // follows the template until the person clicks the toggle
  document.querySelectorAll('#coachLangBtn .lang-opt').forEach(o => o.classList.toggle('on', o.dataset.l === coachLang));
}
$('coachLangBtn').addEventListener('click', () => { coachLang = coachLangNow() === 'km' ? 'en' : 'km'; coachLangManual = true; coachSyncLang(); });
document.querySelectorAll('.tpl-swatch').forEach(el => el.addEventListener('click', coachSyncLang));

// ---------- Buttons ----------
$('coachCheckBtn').addEventListener('click', coachShowCheck);
$('coachGapsBtn').addEventListener('click', () =>
  coachRun('coachGapsBtn', 'gaps', {lang: coachLangNow()}, 'សំណួរដើម្បីបន្ថែមព័ត៌មាន / Questions to improve your CV'));
$('coachInterviewBtn').addEventListener('click', () =>
  // Target position: the Cover Letter "Position" if filled, otherwise the CV job title (no extra input needed).
  coachRun('coachInterviewBtn', 'interview', {lang: coachLangNow(), position: (state.clPosition || state.jobTitle || '').trim()}, 'សំណួរសម្ភាសន៍ / Interview questions'));
$('coachCloseBtn').addEventListener('click', coachClose);
$('coachCopyBtn').addEventListener('click', async () => {
  const t = $('coachText').textContent; if(!t) return;
  try{ await navigator.clipboard.writeText(t); $('coachMsg').className = 'ai-msg'; $('coachMsg').textContent = '📋 បានចម្លង / Copied'; }
  catch(e){ const r = document.createRange(); r.selectNodeContents($('coachText')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
});
coachSyncLang();
