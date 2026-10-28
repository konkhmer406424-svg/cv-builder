/* khqr.js — KHQR payment: create QR, poll status, copy code, manual unlock code */

// ---- Bakong Relay: generate a KHQR code for this order ----
async function generateQr(){
  $('abaPayError').style.display = 'none';
  $('payWaitError').style.display = 'none';
  $('qrRetryBtn').style.display = 'none';
  $('qrStatusText').textContent = 'កំពុងរង់ចាំការទូទាត់... / Waiting for payment...';
  $('genQrBtn').disabled = true;
  $('genQrBtn').textContent = 'កំពុងរៀបចំ... / Preparing...';
  const GENERIC_PAY_ERR = 'មានបញ្ហា សូមសាកល្បងម្ដងទៀត / Something went wrong, please try again';
  const rawName = (state.fullName || '').trim();
  if(!rawName){
    $('abaPayError').textContent = 'សូមវាយ "ឈ្មោះពេញ" នៅផ្នែកខាងលើជាមុនសិន / Please enter your Full Name above first';
    $('abaPayError').style.display = 'block';
    $('genQrBtn').disabled = false;
    $('genQrBtn').textContent = 'បង្កើត KHQR ទូទាត់ / Generate Payment QR';
    return;
  }
  $('abaPayError').textContent = GENERIC_PAY_ERR;
  try{
    const ownerName = encodeURIComponent(rawName);
    try{ sessionStorage.setItem(PENDING_NAME_KEY, rawName); }catch(e){}
    const res = await fetch(CODE_CHECK_URL + '?action=createPayment&amount=2&name=' + ownerName);
    const data = await res.json();
    if(!data.success || !data.md5 || !data.image){
      throw new Error(data.reason || 'createPayment failed');
    }
    try{ sessionStorage.setItem(PENDING_MD5_KEY, data.md5); }catch(e){}
    $('qrImage').src = data.image;
    showPayStep('qr');
    pollPaymentStatus(data.md5, POLL_MAX_TRIES);
  }catch(err){
    $('abaPayError').style.display = 'block';
  }
  $('genQrBtn').disabled = false;
  $('genQrBtn').textContent = 'បង្កើត KHQR ទូទាត់ / Generate Payment QR';
}
$('genQrBtn').addEventListener('click', generateQr);
$('qrRetryBtn').addEventListener('click', generateQr);
$('successContinueBtn').addEventListener('click', ()=>{
  hidePayModal();
  runDownloadAction(pendingDownloadAction);
});

// ---- Copy the unlock code to the clipboard ----
$('copyCodeBtn').addEventListener('click', async ()=>{
  const code = ($('successCodeText').textContent || '').trim();
  const btn = $('copyCodeBtn');
  if(!code || code === '----') return;
  let ok = false;
  try{
    await navigator.clipboard.writeText(code);
    ok = true;
  }catch(e){
    // Fallback for browsers/webviews without the async clipboard API
    try{
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, code.length);
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    }catch(e2){ ok = false; }
  }
  const original = '📋 ចម្លង Code / Copy code';
  btn.textContent = ok ? '✓ បានចម្លង / Copied' : 'សូមចុចលើ code ហើយចម្លងដោយដៃ / Please copy the code manually';
  setTimeout(()=>{ btn.textContent = original; }, 2000);
});

// ---- Bakong Relay: poll for confirmation after the QR is shown ----
function pollPaymentStatus(md5, triesLeft){
  fetch(CODE_CHECK_URL + '?action=checkStatus&md5=' + encodeURIComponent(md5))
    .then(res => res.json())
    .then(data=>{
      if(data.success){
        try{ sessionStorage.removeItem(PENDING_MD5_KEY); }catch(e){}
        let paidName = '';
        try{ paidName = sessionStorage.getItem(PENDING_NAME_KEY) || ''; }catch(e){}
        setUnlocked(data.code, paidName || (state.fullName || '').trim());
        $('successCodeText').textContent = data.code || '----';
        showPayStep('success');
        return;
      }
      if(data.status === 'expired' || triesLeft <= 0){
        $('payWaitError').style.display = 'block';
        $('qrRetryBtn').style.display = 'block';
        $('qrStatusText').textContent = '';
        try{ sessionStorage.removeItem(PENDING_MD5_KEY); }catch(e){}
        return;
      }
      if(data.status === 'scanned'){
        $('qrStatusText').textContent = 'បានស្កេន — កំពុងបញ្ជាក់ការទូទាត់... / Scanned — confirming payment...';
      }
      pollTimer = setTimeout(()=> pollPaymentStatus(md5, triesLeft - 1), POLL_INTERVAL_MS);
    })
    .catch(()=>{
      if(triesLeft <= 0){
        $('payWaitError').style.display = 'block';
        $('qrRetryBtn').style.display = 'block';
        return;
      }
      pollTimer = setTimeout(()=> pollPaymentStatus(md5, triesLeft - 1), POLL_INTERVAL_MS);
    });
}

// On load: if a QR was pending before the tab was closed/refreshed, resume
// polling it (but we have no image to re-show, so just fall back to letting
// the person tap "Generate Payment QR" again if it's actually gone).
(function resumePendingIfAny(){
  let md5;
  try{ md5 = sessionStorage.getItem(PENDING_MD5_KEY); }catch(e){}
  if(!md5 || isUnlocked()) return;
  let pendingName = '';
  try{ pendingName = sessionStorage.getItem(PENDING_NAME_KEY) || ''; }catch(e){}
  try{ sessionStorage.removeItem(PENDING_MD5_KEY); }catch(e){}
  fetch(CODE_CHECK_URL + '?action=checkStatus&md5=' + encodeURIComponent(md5))
    .then(res => res.json())
    .then(data=>{
      if(data.success && data.code){
        setUnlocked(data.code, pendingName || (state.fullName || '').trim());
      }
    })
    .catch(()=>{});
})();

// ---- Manual unlock-code fallback (unchanged from before) ----
$('unlockSubmitBtn').addEventListener('click', async ()=>{
  const entered = $('unlockCodeInput').value.trim();
  if(!entered) return;
  $('unlockError').style.display = 'none';
  $('unlockSubmitBtn').disabled = true;
  $('unlockSubmitBtn').textContent = 'កំពុងពិនិត្យ... / Checking...';
  try{
    const typedName = (state.fullName || '').trim();
    const ownerName = encodeURIComponent(typedName);
    const res = await fetch(CODE_CHECK_URL + '?code=' + encodeURIComponent(entered) + '&name=' + ownerName);
    const data = await res.json();
    if(data.success === true){
      setUnlocked(entered, typedName);
      hidePayModal();
      runDownloadAction(pendingDownloadAction);
    } else {
      if(data.reason === 'name_mismatch'){
        $('unlockError').textContent = 'Code នេះភ្ជាប់ជាមួយ CV ផ្សេង — សូមប្រាកដថាបានវាយ "ឈ្មោះពេញ" ដូចលើកមុនត្រឹមត្រូវ / This code is bound to a different name — make sure "Full Name" above matches what you used before';
      } else if(data.reason === 'missing_name'){
        $('unlockError').textContent = 'សូមវាយ "ឈ្មោះពេញ" នៅផ្នែកខាងលើជាមុនសិន / Please enter your Full Name above first';
      } else if(data.reason === 'expired'){
        $('unlockError').textContent = 'Code នេះផុតកំណត់ 30 ថ្ងៃហើយ / This code has expired (30 days)';
      } else if(data.reason === 'missing_code'){
        $('unlockError').textContent = 'សូមវាយ Unlock Code / Please enter a code';
      } else {
        $('unlockError').textContent = 'Code មិនត្រឹមត្រូវ / Invalid code';
      }
      $('unlockError').style.display = 'block';
    }
  }catch(err){
    $('unlockError').textContent = 'មានបញ្ហាតភ្ជាប់ សូមសាកល្បងម្ដងទៀត / Connection error, please try again';
    $('unlockError').style.display = 'block';
  }
  $('unlockSubmitBtn').disabled = false;
  $('unlockSubmitBtn').textContent = 'ដោះសោ Download';
});
$('unlockCodeInput').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') $('unlockSubmitBtn').click();
});
