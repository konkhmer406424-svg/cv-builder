/* entries.js — Repeating form sections: experience, education, references, custom sections */

// ---- Experience entries ----
function renderExpForm(){
  const wrap = $('expList');
  wrap.innerHTML = '';
  state.exp.forEach((item, i)=>{
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      ${state.exp.length>1 ? `<button class="entry-remove" data-i="${i}" data-type="exp">×</button>` : ''}
      <label>តួនាទីការងារ / Role</label>
      <input type="text" data-field="role" data-i="${i}" value="${escapeAttr(item.role)}" placeholder="Media Executive">
      ${aiBarFor('#expList input[data-field="role"][data-i="'+i+'"]','title',true)}
      <label>ក្រុមហ៊ុន / Company</label>
      <input type="text" data-field="company" data-i="${i}" value="${escapeAttr(item.company)}" placeholder="ABC Company">
      <div class="row2">
        <div><label>ថ្ងៃចាប់ផ្ដើម / Start Date</label>
          <input type="month" data-field="startDate" data-i="${i}" value="${escapeAttr(item.startDate)}"></div>
        <div><label>ថ្ងៃបញ្ចប់ / End Date</label>
          <input type="month" data-field="endDate" data-i="${i}" value="${escapeAttr(item.endDate)}" ${item.current ? 'disabled' : ''}></div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:8px;">
        <input type="checkbox" data-field="current" data-i="${i}" data-type="checkbox" style="width:auto;" ${item.current ? 'checked' : ''}>
        <span style="margin:0;">កំពុងធ្វើការនៅទីនេះ / Currently working here</span>
      </label>
      <label>ការពិពណ៌នា / Description</label>
      <textarea data-field="desc" data-i="${i}" placeholder="One achievement per line — each line becomes a bullet point">${escapeHtml(item.desc)}</textarea>
      ${aiBarFor('#expList textarea[data-field="desc"][data-i="'+i+'"]','lines',false)}
    `;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('input[type=text],input[type=month],textarea').forEach(el=>{
    el.addEventListener('input', e=>{
      const i = e.target.dataset.i, field = e.target.dataset.field;
      state.exp[i][field] = e.target.value;
      render();
    });
  });
  wrap.querySelectorAll('input[type=checkbox]').forEach(el=>{
    el.addEventListener('change', e=>{
      const i = e.target.dataset.i, field = e.target.dataset.field;
      state.exp[i][field] = e.target.checked;
      renderExpForm(); render();
    });
  });
  wrap.querySelectorAll('.entry-remove').forEach(btn=>{
    btn.addEventListener('click', e=>{
      state.exp.splice(Number(e.target.dataset.i),1);
      renderExpForm(); render();
    });
  });
}
$('addExp').addEventListener('click', ()=>{
  state.exp.push({role:'',company:'',startDate:'',endDate:'',current:false,desc:''});
  renderExpForm(); render();
});

// ---- Education entries ----
function renderEduForm(){
  const wrap = $('eduList');
  wrap.innerHTML = '';
  state.edu.forEach((item, i)=>{
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      ${state.edu.length>1 ? `<button class="entry-remove" data-i="${i}" data-type="edu">×</button>` : ''}
      <label>សញ្ញាបត្រ / Degree</label>
      <input type="text" data-field="degree" data-i="${i}" value="${escapeAttr(item.degree)}" placeholder="BA in Marketing">
      <div class="row2">
        <div><label>សាលា / School</label>
          <input type="text" data-field="school" data-i="${i}" value="${escapeAttr(item.school)}" placeholder="RUPP"></div>
        <div><label>កាលបរិច្ឆេទ / Dates</label>
          <input type="text" data-field="dates" data-i="${i}" value="${escapeAttr(item.dates)}" placeholder="2018 – 2022"></div>
      </div>
    `;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('input').forEach(el=>{
    el.addEventListener('input', e=>{
      const i = e.target.dataset.i, field = e.target.dataset.field;
      state.edu[i][field] = e.target.value;
      render();
    });
  });
  wrap.querySelectorAll('.entry-remove').forEach(btn=>{
    btn.addEventListener('click', e=>{
      state.edu.splice(Number(e.target.dataset.i),1);
      renderEduForm(); render();
    });
  });
}
$('addEdu').addEventListener('click', ()=>{
  state.edu.push({degree:'',school:'',dates:''});
  renderEduForm(); render();
});

// ---- References ----
function renderRefForm(){
  const wrap = $('refList');
  wrap.innerHTML = '';
  state.refs.forEach((item, i)=>{
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      ${state.refs.length>1 ? `<button class="entry-remove" data-i="${i}" data-type="ref">×</button>` : ''}
      <label>ឈ្មោះ / Name</label>
      <input type="text" data-field="name" data-i="${i}" value="${escapeAttr(item.name)}" placeholder="Chan Sopheak">
      <label>តួនាទី/ទំនាក់ទំនង / Position / Relation</label>
      <input type="text" data-field="role" data-i="${i}" value="${escapeAttr(item.role)}" placeholder="Manager at ABC Company">
      ${aiBarFor('#refList input[data-field="role"][data-i="'+i+'"]','title',true)}
      <label>ទំនាក់ទំនង / Contact</label>
      <input type="text" data-field="contact" data-i="${i}" value="${escapeAttr(item.contact)}" placeholder="+855 12 345 678 / email">
    `;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('input').forEach(el=>{
    el.addEventListener('input', e=>{
      const i = e.target.dataset.i, field = e.target.dataset.field;
      state.refs[i][field] = e.target.value;
      render();
    });
  });
  wrap.querySelectorAll('.entry-remove').forEach(btn=>{
    btn.addEventListener('click', e=>{
      state.refs.splice(Number(e.target.dataset.i),1);
      renderRefForm(); render();
    });
  });
}
$('addRef').addEventListener('click', ()=>{
  state.refs.push({name:'',role:'',contact:''});
  renderRefForm(); render();
});

// ---- Custom sections ----
function renderCustomForm(){
  const wrap = $('customList');
  wrap.innerHTML = '';
  state.custom.forEach((item, i)=>{
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      <button class="entry-remove" data-i="${i}" data-type="custom">×</button>
      <label>ចំណងជើងផ្នែក / Section Title</label>
      <input type="text" data-field="title" data-i="${i}" value="${escapeAttr(item.title)}" placeholder="Height, Weight, Hobby...">
      ${aiBarFor('#customList input[data-field="title"][data-i="'+i+'"]','title',true)}
      <label>បំបែកដោយសញ្ញាក្បៀស (,) / Comma-separated list</label>
      <input type="text" data-field="content" data-i="${i}" value="${escapeAttr(item.content)}" placeholder="170cm, 60kg">
      ${aiBarFor('#customList input[data-field="content"][data-i="'+i+'"]','list',true)}
    `;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('input').forEach(el=>{
    el.addEventListener('input', e=>{
      const i = e.target.dataset.i, field = e.target.dataset.field;
      state.custom[i][field] = e.target.value;
      render();
    });
  });
  wrap.querySelectorAll('.entry-remove').forEach(btn=>{
    btn.addEventListener('click', e=>{
      state.custom.splice(Number(e.target.dataset.i),1);
      renderCustomForm(); render();
    });
  });
}
$('addCustom').addEventListener('click', ()=>{
  state.custom.push({title:'',content:''});
  renderCustomForm(); render();
});
