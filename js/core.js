/* core.js — Core: shared state, $ helper, text/date helpers */

document.querySelectorAll('.acc-header').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    btn.closest('.acc-item').classList.toggle('open');
  });
});

let state = {
  tpl: 't10',
  scale: 1,
  photo: null,
  mode: 'cv',
  clTpl: 'cl1',
  clCompany: '', clHiringManager: '', clPosition: '', clDate: '', clHighlight: '',
  fullName:'', jobTitle:'', email:'', phone:'', location:'', linkedin:'', summary:'',
  exp: [{role:'',company:'',startDate:'',endDate:'',current:false,desc:''}],
  edu: [{degree:'',school:'',dates:''}],
  skills: '',
  languages: '',
  certifications: '',
  interests: '',
  refs: [{name:'',role:'',contact:''}],
  custom: []
};

const $ = id => document.getElementById(id);


function escapeHtml(s){ return (s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }

const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES_KH = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
const KHMER_TEMPLATES = ['t16','t17','t18','t19','t20'];
function isKhmerTemplate(){
  return KHMER_TEMPLATES.includes(state.tpl);
}
function formatMonthYear(ym){
  if(!ym) return '';
  const parts = ym.split('-');
  const y = parseInt(parts[0],10), m = parseInt(parts[1],10);
  if(!y || !m) return '';
  const names = isKhmerTemplate() ? MONTH_NAMES_KH : MONTH_NAMES_EN;
  return `${names[m-1]} ${y}`;
}
function currentYm(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function monthsBetween(startYm, endYm){
  const [sy,sm] = startYm.split('-').map(Number);
  const [ey,em] = endYm.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}
function formatDuration(totalMonths){
  if(totalMonths < 1) return '';
  const yrs = Math.floor(totalMonths / 12);
  const mos = totalMonths % 12;
  const parts = [];
  const kh = isKhmerTemplate();
  if(yrs > 0) parts.push(kh ? `${yrs} ឆ្នាំ` : `${yrs} yr${yrs > 1 ? 's' : ''}`);
  if(mos > 0) parts.push(kh ? `${mos} ខែ` : `${mos} mo${mos > 1 ? 's' : ''}`);
  if(parts.length === 0) parts.push(kh ? '< ១ ខែ' : '< 1 mo');
  return parts.join(' ');
}
function formatExpDateRange(item){
  const startLabel = formatMonthYear(item.startDate);
  if(!startLabel) return '';
  const endYm = item.current ? currentYm() : item.endDate;
  const endLabel = item.current ? (isKhmerTemplate() ? 'បច្ចុប្បន្ន' : 'Present') : formatMonthYear(item.endDate);
  if(!endLabel) return startLabel;
  const dur = formatDuration(monthsBetween(item.startDate, endYm));
  return dur ? `${startLabel} – ${endLabel} (${dur})` : `${startLabel} – ${endLabel}`;
}
