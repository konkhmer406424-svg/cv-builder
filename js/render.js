/* render.js — CV preview rendering (all 20 templates) */

function render(){
  applyLangMode();
  if(state.mode === 'cl'){ renderCoverLetter(); return; }
  const r = $('resume');
  r.className = state.tpl + (isUnlocked() ? '' : ' watermarked');
  r.style.setProperty('--scale', state.scale);

  const contactBits = [state.email, state.phone, state.location, state.linkedin].filter(Boolean);
  const skillsArr = state.skills.split(',').map(s=>s.trim()).filter(Boolean);

  const contactHtml = `<div class="contact-line">${contactBits.map(b=>`<span>${escapeHtml(b)}</span>`).join('')}</div>`;
  const photoHtml = state.photo
    ? `<div class="photo-wrap"><img class="photo" src="${state.photo}" alt="Photo"></div>`
    : `<div class="photo-wrap"><div class="photo photo-placeholder">Photo</div></div>`;
  const headerHtml = `
    <div class="head-block${state.photo ? '' : ' no-photo'}">
      ${photoHtml}
      <div class="head-text">
        <h2 class="name">${escapeHtml(state.fullName) || 'Your Name'}</h2>
        <p class="title">${escapeHtml(state.jobTitle) || 'Professional Title'}</p>
        ${contactHtml}
      </div>
    </div>
  `;
  const summaryHtml = state.summary ? `<p class="summary">${escapeHtml(state.summary)}</p>` : '';

  // Templates t16–t20 are fully Khmer-language resumes: section headings render in Khmer
  // instead of English. All other templates keep the original English headings.
  const KHMER_TPLS = new Set(['t16','t17','t18','t19','t20']);
  const L = KHMER_TPLS.has(state.tpl) ? {
    exp:'បទពិសោធន៍ការងារ', edu:'ការសិក្សា', skills:'ជំនាញ', lang:'ភាសា',
    cert:'វិញ្ញាបនបត្រ', interest:'ចំណូលចិត្ត', ref:'អ្នកយោង'
  } : {
    exp:'Experience', edu:'Education', skills:'Skills', lang:'Languages',
    cert:'Certifications', interest:'Interests', ref:'References'
  };

  const expHtml = state.exp.some(x=>x.role||x.company) ? `
    <section class="block">
      <h3>${L.exp}</h3>
      ${state.exp.filter(x=>x.role||x.company).map(x=>`
        <div class="item">
          <div class="item-top">
            <span class="item-role">${escapeHtml(x.role)}</span>
            <span class="item-date">${formatExpDateRange(x)}</span>
          </div>
          <div class="item-sub">${escapeHtml(x.company)}</div>
          ${x.desc ? `<ul class="item-desc-list">${x.desc.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>`<li>${escapeHtml(l)}</li>`).join('')}</ul>` : ''}
        </div>
      `).join('')}
    </section>` : '';

  const eduHtml = state.edu.some(x=>x.degree||x.school) ? `
    <section class="block">
      <h3>${L.edu}</h3>
      ${state.edu.filter(x=>x.degree||x.school).map(x=>`
        <div class="item">
          <div class="item-top">
            <span class="item-role">${escapeHtml(x.degree)}</span>
            <span class="item-date">${escapeHtml(x.dates)}</span>
          </div>
          <div class="item-sub">${escapeHtml(x.school)}</div>
        </div>
      `).join('')}
    </section>` : '';

  const skillsHtml = skillsArr.length ? `
    <section class="block">
      <h3>${L.skills}</h3>
      <div class="skills-list">${skillsArr.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>
    </section>` : '';

  const langArr = state.languages.split(',').map(s=>s.trim()).filter(Boolean);
  const languagesHtml = langArr.length ? `
    <section class="block">
      <h3>${L.lang}</h3>
      <div class="skills-list">${langArr.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>
    </section>` : '';

  const certArr = state.certifications.split('\n').map(s=>s.trim()).filter(Boolean);
  const certHtml = certArr.length ? `
    <section class="block">
      <h3>${L.cert}</h3>
      <ul class="plain-list">${certArr.map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ul>
    </section>` : '';

  const interestArr = state.interests.split(',').map(s=>s.trim()).filter(Boolean);
  const interestsHtml = interestArr.length ? `
    <section class="block">
      <h3>${L.interest}</h3>
      <div class="skills-list">${interestArr.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>
    </section>` : '';

  const refsHtml = state.refs.some(x=>x.name||x.role||x.contact) ? `
    <section class="block">
      <h3>${L.ref}</h3>
      ${state.refs.filter(x=>x.name||x.role||x.contact).map(x=>`
        <div class="item">
          <div class="item-top"><span class="item-role">${escapeHtml(x.name)}</span></div>
          <div class="item-sub">${escapeHtml(x.role)}</div>
          ${x.contact ? `<div class="item-desc">${escapeHtml(x.contact)}</div>` : ''}
        </div>
      `).join('')}
    </section>` : '';

  const customArr = state.custom.filter(c=>c.title && c.content);
  const customHtml = customArr.map(c=>{
    const items = c.content.split(',').map(s=>s.trim()).filter(Boolean);
    return `
    <section class="block">
      <h3>${escapeHtml(c.title)}</h3>
      <div class="skills-list">${items.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>
    </section>`;
  }).join('');

  const extrasHtml = languagesHtml + certHtml + interestsHtml + customHtml + refsHtml;

  if (state.tpl === 't2' || state.tpl === 't3' || state.tpl === 't7' || state.tpl === 't15' || state.tpl === 't19'){
    r.innerHTML = `
      <div class="side">
        ${headerHtml}
        ${skillsHtml}
        ${languagesHtml}
        ${interestsHtml}
        ${customHtml}
      </div>
      <div class="main">
        ${summaryHtml}
        ${expHtml}
        ${eduHtml}
        ${certHtml}
        ${refsHtml}
      </div>
    `;
    requestAnimationFrame(()=>{
      const sideEl = r.querySelector('.side');
      const mainEl = r.querySelector('.main');
      if(sideEl && mainEl){
        sideEl.style.minHeight = mainEl.offsetHeight + 'px';
      }
    });
  } else if (state.tpl === 't4' || state.tpl === 't5' || state.tpl === 't8' || state.tpl === 't9' || state.tpl === 't11' || state.tpl === 't14' || state.tpl === 't17' || state.tpl === 't20'){
    r.innerHTML = `
      <div class="head">${headerHtml}</div>
      <div class="body">
        ${summaryHtml}
        ${expHtml}
        ${eduHtml}
        ${skillsHtml}
        ${extrasHtml}
      </div>
    `;
  } else {
    r.innerHTML = `
      ${headerHtml}
      ${summaryHtml}
      ${expHtml}
      ${eduHtml}
      ${skillsHtml}
      ${extrasHtml}
    `;
  }
  saveState();
}
