/* unlock.js — Payment gate: unlock check (code + name, 30 days) */

try{ localStorage.removeItem(OLD_UNLOCK_STORAGE_KEY); }catch(e){}

// Same normalisation idea as the server: NFC, drop zero-width chars, lowercase, collapse spaces.
function normName(str){
  return (str || '').toString().normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim().toLowerCase().replace(/\s+/g, ' ');
}
function readUnlock(){
  try{
    const raw = localStorage.getItem(UNLOCK_STORAGE_KEY);
    if(!raw) return null;
    const d = JSON.parse(raw);
    return (d && typeof d === 'object') ? d : null;
  }catch(e){ return null; }
}
// Unlocked ONLY if a valid code is stored, it has not expired, AND the
// current "Full Name" field matches the name the code was bound to.
// Changing the name therefore locks the download again.
function isUnlocked(){
  const d = readUnlock();
  if(!d || !d.code || !d.name || !d.expiresAt) return false;
  if(Date.now() >= d.expiresAt) return false;
  return normName(d.name) === normName(state.fullName);
}
function setUnlocked(code, name){
  try{
    const expiresAt = Date.now() + UNLOCK_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify({
      code: (code || '').toString().trim(),
      name: (name || '').toString().trim(),
      unlockedAt: Date.now(),
      expiresAt
    }));
  }catch(e){}
  render();
}
function clearUnlocked(){
  try{ localStorage.removeItem(UNLOCK_STORAGE_KEY); }catch(e){}
  render();
}
// Asks the server whether the stored code + name are still valid (30-day limit, name match).
// Returns 'ok' | 'denied' | 'offline'.
async function verifyUnlockOnServer(d){
  try{
    const res = await fetch(CODE_CHECK_URL + '?code=' + encodeURIComponent(d.code) + '&name=' + encodeURIComponent(d.name));
    const data = await res.json();
    return data.success === true ? 'ok' : 'denied';
  }catch(e){ return 'offline'; }
}
// Runs in the background on page load so downloads stay instant (no await before print()).
async function backgroundVerifyUnlock(){
  const d = readUnlock();
  if(!d) return;
  const r = await verifyUnlockOnServer(d);
  if(r === 'denied') clearUnlocked();
}
