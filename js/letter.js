/* letter.js — Cover letter: content generation + rendering */

// ---- Cover Letter: content generation (auto-filled from the same data as the CV) ----
function clFirstExp(){ return state.exp.find(x=>x.role||x.company) || null; }
function clSkillsList(n){ return state.skills.split(',').map(s=>s.trim()).filter(Boolean).slice(0,n); }
function clToday(){
  return new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});
}
function buildCoverLetterContent(){
  const name = state.fullName || 'Your Name';
  const position = state.clPosition.trim() || state.jobTitle.trim() || 'this position';
  const company = state.clCompany.trim() || 'your company';
  const hiring = state.clHiringManager.trim();
  const salutation = hiring ? `Dear ${hiring},` : 'Dear Hiring Manager,';
  const exp = clFirstExp();
  const expLine = exp ? `${exp.role || 'my role'} at ${exp.company || 'my previous company'}` : 'my recent professional experience';
  const skills = clSkillsList(4);
  const skillsLine = skills.length ? skills.join(', ') : 'a strong and relevant skill set';
  const summary = state.summary.trim();
  const highlight = state.clHighlight.trim();
  const firstDescLine = (exp && exp.desc) ? exp.desc.split('\n')[0].trim().replace(/^[-•]\s*/, '') : '';

  const variants = {
    cl1: [
      `I am writing to apply for the ${position} position at ${company}. With a background in ${state.jobTitle.trim() || 'this field'} and hands-on experience as ${expLine}, I believe I would be a strong fit for your team.`,
      `${summary || `My core strengths include ${skillsLine}, which I have applied directly in previous roles to deliver real results.`}${highlight ? ' ' + highlight : ''}`,
      `I would welcome the chance to discuss how I can contribute to ${company}. Thank you for your time and consideration — I look forward to hearing from you.`
    ],
    cl2: [
      `I am writing to express my interest in the ${position} role at ${company}. I believe my professional background and skill set make me a strong candidate for this opportunity.`,
      `${summary || `Over the course of my career, I have developed expertise as ${expLine}, building strong capabilities in ${skillsLine}.`}${highlight ? ' ' + highlight : ''}`,
      `I am confident that my experience and dedication would allow me to contribute meaningfully to your team at ${company}. I am particularly drawn to this role because it aligns closely with both my skills and my career goals.`,
      `Thank you for considering my application. I have attached my resume for your review and would welcome the opportunity to discuss my qualifications further at your convenience.`
    ],
    cl3: [
      `My name is ${name}, and I would like to apply for the ${position} position at ${company}.`,
      `I have experience working as ${expLine}. I am good at ${skillsLine}.`,
      `${highlight || `I work hard, I learn quickly, and I want to help ${company} grow.`}`,
      `Thank you for reading my letter. I hope to talk with you soon.`
    ],
    cl4: [
      `I am excited to submit my application for the ${position} position at ${company}. ${summary || `With a solid foundation as ${expLine}, I have built a track record of delivering measurable results and growing steadily in my field.`}`,
      `In my most recent role${exp && exp.company ? ` at ${exp.company}` : ''}, I ${firstDescLine ? firstDescLine.toLowerCase() : 'took on responsibilities that strengthened my expertise and delivered clear value to the organization'}. This experience sharpened my abilities in ${skillsLine}, which I understand are central to success in this role.`,
      `${highlight || `Beyond technical skills, I bring strong communication, adaptability, and a genuine commitment to quality — qualities I believe are essential for the ${position} role.`}`,
      `I am confident that my background positions me to make an immediate and lasting contribution to ${company}, and I am eager to bring that same energy and reliability to your team.`,
      `Thank you very much for taking the time to review my application. I have attached my resume for further detail and would greatly welcome the opportunity for an interview at your convenience.`
    ],
    cl5: [
      `Hi${hiring ? ' ' + hiring : ''}, I'm ${name}, and I'd love to be considered for the ${position} role at ${company}!`,
      `${summary || `I've spent my career working as ${expLine}, and I genuinely enjoy the kind of work this role involves.`}`,
      `Here's a quick snapshot of what I bring:`,
      `${highlight || `I'm someone who takes ownership, learns fast, and enjoys collaborating with a team that cares about doing great work.`}`,
      `Thanks so much for considering my application — I'd love the chance to chat more about how I could contribute to ${company}.`
    ]
  };

  return {salutation, variants, skills, name, position, company, hiring};
}
function renderCoverLetter(){
  const r = $('resume');
  r.className = 'letter ' + state.clTpl + (isUnlocked() ? '' : ' watermarked');
  r.style.setProperty('--scale', state.scale);

  const {salutation, variants, skills, name, company, hiring} = buildCoverLetterContent();
  const paras = variants[state.clTpl] || variants.cl2;
  const contactBits = [state.email, state.phone, state.location, state.linkedin].filter(Boolean);
  const contactLine = contactBits.map(escapeHtml).join('&nbsp;&nbsp;•&nbsp;&nbsp;');
  const dateLine = state.clDate.trim() || clToday();
  const recipientLines = [escapeHtml(hiring || 'Hiring Manager'), escapeHtml(company)].join('<br>');

  let bodyParasHtml;
  if(state.clTpl === 'cl5'){
    const bulletSkills = skills.length ? skills : ['adaptability','collaboration','problem-solving'];
    bodyParasHtml = `
      <p>${escapeHtml(paras[0])}</p>
      <p>${escapeHtml(paras[1])}</p>
      <p>${escapeHtml(paras[2])}</p>
      <ul class="letter-bullets">${bulletSkills.slice(0,3).map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ul>
      <p>${escapeHtml(paras[3])}</p>
      <p>${escapeHtml(paras[4])}</p>
    `;
  } else {
    bodyParasHtml = paras.map(p=>`<p>${escapeHtml(p)}</p>`).join('');
  }

  r.innerHTML = `
    <div class="letter-head">
      <div class="letter-sender">
        <div class="ls-name">${escapeHtml(name)}</div>
        ${contactLine ? `<div class="ls-contact">${contactLine}</div>` : ''}
      </div>
      <div class="letter-date">${escapeHtml(dateLine)}</div>
      <div class="letter-recipient">${recipientLines}</div>
    </div>
    <div class="letter-body">
      <p class="salutation">${escapeHtml(salutation)}</p>
      ${bodyParasHtml}
      <p class="closing">Sincerely,<br>${escapeHtml(name)}</p>
    </div>
  `;
  saveState();
}
