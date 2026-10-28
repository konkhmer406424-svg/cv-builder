/* download.js — Download choice, pay modal steps, print + watermark failsafe */

// ---- Step switching inside the pay modal ----
let pollTimer = null;
function stopPolling(){
  if(pollTimer){ clearTimeout(pollTimer); pollTimer = null; }
}
function showPayStep(step){
  $('payStepPay').style.display = step === 'pay' ? '' : 'none';
  $('payStepQr').style.display = step === 'qr' ? '' : 'none';
  $('payStepSuccess').style.display = step === 'success' ? '' : 'none';
  $('payStepManual').style.display = step === 'manual' ? '' : 'none';
  if(step !== 'qr') stopPolling();
}
function showPayModal(){
  $('abaPayError').style.display = 'none';
  $('payWaitError').style.display = 'none';
  $('unlockError').style.display = 'none';
  $('unlockCodeInput').value = '';
  showPayStep('pay');
  $('payModalOverlay').style.display = 'flex';
}
function hidePayModal(){
  stopPolling();
  $('payModalOverlay').style.display = 'none';
}

function showDownloadChoice(){
  $('downloadChoiceOverlay').style.display = 'flex';
}
function hideDownloadChoice(){
  $('downloadChoiceOverlay').style.display = 'none';
}
$('printBtn').addEventListener('click', showDownloadChoice);
$('dlChoiceCancel').addEventListener('click', hideDownloadChoice);
$('downloadChoiceOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'downloadChoiceOverlay') hideDownloadChoice();
});

// Builds the full #resume markup for a given mode ('cv' or 'cl') without
// disturbing the mode the user is actually looking at, by switching state.mode
// just long enough to render, then restoring it.
function buildResumeHtmlForMode(mode){
  const prevMode = state.mode;
  state.mode = mode;
  render();
  const html = $('resume').outerHTML;
  state.mode = prevMode;
  return html;
}

let pendingDownloadAction = localStorage.getItem('cvBuilderPendingAction_v1') || 'cv';
if(!['cv','cl','both'].includes(pendingDownloadAction)) pendingDownloadAction = 'cv'; // drop old 'export'/'import' values

function proceedToPrint(action){
  hideDownloadChoice();
  pendingDownloadAction = action;
  try{ localStorage.setItem('cvBuilderPendingAction_v1', action); }catch(e){}
  if(!isUnlocked()){
    showPayModal();
    return;
  }
  runDownloadAction(action);
}
function runDownloadAction(action){
  if(action === 'cv'){
    if(state.mode !== 'cv'){ state.mode = 'cv'; applyModeVisibility(); render(); }
    window.print();
  } else if(action === 'cl'){
    if(state.mode !== 'cl'){ state.mode = 'cl'; applyModeVisibility(); render(); }
    window.print();
  } else if(action === 'both'){
    const cvHtml = buildResumeHtmlForMode('cv');
    const clHtml = buildResumeHtmlForMode('cl');
    render(); // restore the view the user was actually on
    $('printBothWrap').innerHTML = `<div>${cvHtml}</div><div>${clHtml}</div>`;
    document.body.classList.add('printing-both');
    window.print();
  }
}
$('dlChoiceCv').addEventListener('click', ()=> proceedToPrint('cv'));
$('dlChoiceCl').addEventListener('click', ()=> proceedToPrint('cl'));
$('dlChoiceBoth').addEventListener('click', ()=> proceedToPrint('both'));

// ---- Watermark failsafe: fires before ANY print (button, Ctrl+P, browser menu, right-click) ----
// A user could bypass the button above entirely (DevTools, Ctrl+P, etc), so we re-check the
// unlock status every single time the browser is about to print, no matter how it was triggered.
// querySelectorAll (not getElementById) is used deliberately: when printing "Both", the print
// area temporarily contains two #resume-style pages, and the watermark must cover every one of them.
function addPrintWatermark(){
  document.querySelectorAll('#resume').forEach(resume=>{
    if(!resume || resume.querySelector('.print-watermark')) return;
    const wrap = document.createElement('div');
    wrap.className = 'print-watermark';
    const label = 'NOT PAID / មិនទាន់ទូទាត់';
    let html = '';
    for(let i = 0; i < 30; i++){ html += `<span>${label}</span>`; }
    wrap.innerHTML = html;
    resume.appendChild(wrap);
  });
}
function removePrintWatermark(){
  document.querySelectorAll('.print-watermark').forEach(wm => wm.remove());
}
window.addEventListener('beforeprint', ()=>{
  if(!isUnlocked()){
    addPrintWatermark();
  } else {
    removePrintWatermark();
  }
});
window.addEventListener('afterprint', ()=>{
  removePrintWatermark();
  if(document.body.classList.contains('printing-both')){
    document.body.classList.remove('printing-both');
    $('printBothWrap').innerHTML = '';
  }
});
$('payModalCloseBtn').addEventListener('click', hidePayModal);
$('payModalOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'payModalOverlay') hidePayModal();
});

// ---- Step navigation buttons ----
$('showManualCodeBtn').addEventListener('click', ()=> showPayStep('manual'));
$('waitingShowManualBtn').addEventListener('click', ()=> showPayStep('manual'));
$('backToPayBtn').addEventListener('click', ()=> showPayStep('pay'));
