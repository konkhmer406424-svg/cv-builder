/* main.js — Start-up: load saved data and draw the first render */

Object.assign(state, loadState());
populateFormFromState();
renderExpForm();
renderEduForm();
renderRefForm();
renderCustomForm();
render();
backgroundVerifyUnlock();
fitPreview();
