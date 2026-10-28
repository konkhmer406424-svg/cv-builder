/* ai.js — AI helper bar (translate / improve text) — talks to the Cloudflare Worker */

// ---- AI helper (Cloudflare Worker /ai — the API key never touches this page) ----
// Templates 1–15 = English CV, templates 16–20 = Khmer CV.
function langMode(){
  const n = parseInt(String(state.tpl).replace(/\D/g, ''), 10);
  return (n >= 16 && n <= 20) ? 'km' : 'en';
}
const AI_BTN_TRANSLATE =
  '<button type="button" class="ai-btn" data-ai="to_english">🇬🇧 ខ្មែរ → English</button>' +
  '<button type="button" class="ai-btn" data-ai="to_khmer">🇰🇭 English → ខ្មែរ</button>';
const AI_BTN_TAIL =
  '<button type="button" class="ai-btn" data-ai="undo" style="display:none;">↶ ត្រឡប់ / Undo</button>' +
  '<span class="ai-msg"></span>';
const AI_BAR_HTML = AI_BTN_TRANSLATE +
  '<button type="button" class="ai-btn" data-ai="fix">✓ កែអក្ខរាវិរុទ្ធ / Fix</button>' +
  '<button type="button" class="ai-btn" data-ai="improve">✨ កែសម្រួល / Improve</button>' + AI_BTN_TAIL;
const AI_BAR_MINI_HTML = AI_BTN_TRANSLATE + AI_BTN_TAIL;
// For forms that are rebuilt by JS: sel = CSS selector of the field, kind = title | list | lines | text
function aiBarFor(sel, kind, mini){
  return '<div class="ai-bar" data-sel=\'' + sel + '\' data-kind="' + kind + '">' + (mini ? AI_BAR_MINI_HTML : AI_BAR_HTML) + '</div>';
}
const AI_ERRORS = {
  unlock_required: 'សូមដោះសោ (Unlock) ជាមុនសិន / Unlock first to use AI',
  total_limit: 'ប្រើគ្រប់ចំនួន AI សរុបសម្រាប់ Code នេះហើយ / You have used all AI requests included with this code',
  daily_limit: 'ប្រើគ្រប់កំណត់ប្រចាំថ្ងៃហើយ សូមសាកល្បងថ្ងៃស្អែក / Daily AI limit reached — try again tomorrow',
  too_long: 'អត្ថបទវែងពេក / Text is too long',
  empty_text: 'សូមវាយអត្ថបទជាមុន / Type some text first',
  upstream_error: 'AI មានបញ្ហា សូមសាកល្បងម្ដងទៀត / AI error, please try again',
  upstream_unreachable: 'AI មានបញ្ហា សូមសាកល្បងម្ដងទៀត / AI error, please try again',
  empty_result: 'AI មិនបានឆ្លើយ សូមសាកល្បងម្ដងទៀត / AI returned nothing, try again'
};
const aiPrev = new WeakMap();   // field -> text before the last AI change (for Undo)
async function runAi(bar, btn){
  const ta = bar.dataset.sel ? document.querySelector(bar.dataset.sel) : null; if(!ta) return;
  const msg = bar.querySelector('.ai-msg'), undoBtn = bar.querySelector('[data-ai="undo"]');
  const setMsg = (m, err) => { msg.textContent = m || ''; msg.className = 'ai-msg' + (err ? ' err' : ''); };
  const action = btn.dataset.ai;
  if(action === 'undo'){
    if(aiPrev.has(ta)){ ta.value = aiPrev.get(ta); ta.dispatchEvent(new Event('input', {bubbles:true})); aiPrev.delete(ta); undoBtn.style.display = 'none'; setMsg(''); }
    return;
  }
  const text = ta.value.trim();
  if(!text){ setMsg(AI_ERRORS.empty_text, true); return; }
  if(!isUnlocked()){ setMsg(AI_ERRORS.unlock_required, true); showPayModal(); return; }
  const d = readUnlock();
  const btns = bar.querySelectorAll('button'); btns.forEach(b => b.disabled = true);
  setMsg('កំពុងដំណើរការ… / Working…');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 45000);
  try{
    const res = await fetch(AI_URL, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: d.code, fullName: d.name, action, text, kind: bar.dataset.kind || 'text' })
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || !data.text){
      if(data.error === 'unlock_required') showPayModal();
      setMsg(AI_ERRORS[data.error] || 'មានបញ្ហា / Something went wrong', true);
    } else {
      aiPrev.set(ta, ta.value);
      ta.value = data.text;
      ta.dispatchEvent(new Event('input', {bubbles:true}));   // updates state + preview + autosave
      undoBtn.style.display = '';
      setMsg('');
    }
  }catch(e){
    setMsg('មានបញ្ហាតភ្ជាប់ / Connection error', true);
  }finally{
    clearTimeout(timer); btns.forEach(b => b.disabled = false);
  }
}
document.addEventListener('click', e => {
  const btn = e.target.closest('.ai-bar [data-ai]');
  if(btn) runAi(btn.closest('.ai-bar'), btn);
});
document.querySelectorAll('.ai-bar:empty').forEach(b => { b.innerHTML = b.dataset.mini ? AI_BAR_MINI_HTML : AI_BAR_HTML; });
