(() => {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const button = form.querySelector('.submit-button');
  const error = document.getElementById('contact-error');
  const dialog = document.querySelector('.success-dialog');
  const reference = document.getElementById('inquiry-reference');
  let pending = false;
  let submissionId = crypto.randomUUID();
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    pending = true;
    error.hidden = true;
    error.textContent = '';
    button.disabled = true;
    button.textContent = 'Sending inquiry…';
    form.setAttribute('aria-busy', 'true');
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, consent: values.consent === 'on', submissionId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your inquiry could not be saved. Please try again.');
      if (!result.id) throw new Error('We could not confirm your submission. Please try again.');
      reference.textContent = `Inquiry reference: ${result.id}`;
      form.reset();
      submissionId = crypto.randomUUID();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else { dialog.setAttribute('open', ''); dialog.scrollIntoView({ block:'center' }); }
    } catch (failure) {
      error.textContent = failure.message || 'Unable to send. Please try again or call +91 90047 77892.';
      error.hidden = false;
    } finally {
      pending = false;
      button.disabled = false;
      button.textContent = 'Send inquiry ↗';
      form.removeAttribute('aria-busy');
    }
  });
})();
