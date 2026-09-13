document.addEventListener('submit', async (event) => {
  const form = event.target.closest('.neo-google-ai-form');
  if (!form) return;
  event.preventDefault();
  const root = form.closest('.neo-google-ai-chat');
  const input = form.querySelector('textarea');
  const log = root.querySelector('.neo-google-ai-log');
  const button = form.querySelector('button');
  const prompt = input.value.trim();
  if (!prompt) return;
  button.disabled = true;
  log.textContent = 'Thinking…';
  try {
    const response = await fetch(NEOGoogleAI.generateUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type':'application/json', 'X-WP-Nonce': NEOGoogleAI.nonce},
      body: JSON.stringify({prompt, model: root.dataset.model, gem: root.dataset.gem || ''})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    log.textContent = data.text || 'No text returned.';
    input.value = '';
  } catch (error) {
    log.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
