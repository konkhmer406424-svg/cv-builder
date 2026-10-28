/* storage.js — Saving / loading / clearing the CV data in this browser */

function blankState(){
  return {
    tpl:'t10', scale:1, photo:null,
    mode:'cv', clTpl:'cl1',
    clCompany:'', clHiringManager:'', clPosition:'', clDate:'', clHighlight:'',
    fullName:'', jobTitle:'', email:'', phone:'', location:'', linkedin:'', summary:'',
    exp:[{role:'',company:'',startDate:'',endDate:'',current:false,desc:''}],
    edu:[{degree:'',school:'',dates:''}],
    skills:'', languages:'', certifications:'', interests:'',
    refs:[{name:'',role:'',contact:''}],
    custom:[]
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(CV_DATA_KEY);
    if(raw) return Object.assign(blankState(), JSON.parse(raw));
  }catch(e){}
  return blankState();
}
function saveState(){
  try{ localStorage.setItem(CV_DATA_KEY, JSON.stringify(state)); }catch(e){ console.warn('Could not save CV data', e); }
}
function refreshAllForms(){
  populateFormFromState();
  renderExpForm();
  renderEduForm();
  renderRefForm();
  renderCustomForm();
  render();
}

function populateFormFromState(){
  ['fullName','jobTitle','email','phone','location','linkedin'].forEach(k=>{
    if($(k)) $(k).value = state[k] || '';
  });
  ['clCompany','clHiringManager','clPosition','clDate','clHighlight'].forEach(k=>{
    if($(k)) $(k).value = state[k] || '';
  });
  if($('summary')) $('summary').value = state.summary || '';
  if($('skills')) $('skills').value = state.skills || '';
  if($('languages')) $('languages').value = state.languages || '';
  if($('certifications')) $('certifications').value = state.certifications || '';
  if($('interests')) $('interests').value = state.interests || '';

  document.querySelectorAll('.tpl-swatch').forEach(s=>{
    s.classList.toggle('active', s.dataset.tpl === state.tpl);
  });
  const activeSwatch = document.querySelector('.tpl-swatch.active');
  if(activeSwatch) activeSwatch.scrollIntoView({block:'nearest', inline:'center'});
  document.querySelectorAll('.scale-btn').forEach(s=>{
    s.classList.toggle('active', parseFloat(s.dataset.scale) === state.scale);
  });
  document.querySelectorAll('#clTemplatePicker [data-cltpl]').forEach(s=>{
    s.classList.toggle('active', s.dataset.cltpl === state.clTpl);
  });
  applyModeVisibility();

  updatePhotoThumb();
}
$('clearDataBtn').addEventListener('click', (e)=>{
  e.preventDefault();
  if(confirm('សម្អាតទិន្នន័យ CV នេះ? មិនអាចត្រឡប់វិញបានទេ។ / Clear all CV data? This cannot be undone.')){
    Object.assign(state, blankState());
    saveState();
    refreshAllForms();
  }
});
