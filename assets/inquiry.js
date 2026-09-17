const form = document.querySelector('#inquiry-form');
const result = document.querySelector('#inquiry-result');
const kind = document.body.dataset.kind;
const apiOrigin = globalThis.TIRRENIA_CLUB_API_ORIGIN || '';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.name?.trim() || !data.contact?.trim()) {
    result.textContent = 'Please enter your name and contact details.';
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  result.textContent = 'Sending your enquiry…';
  try {
    if (!apiOrigin) throw new Error('service_unavailable');
    const response = await fetch(`${apiOrigin}/api/v1/inquiries/public/createInquiry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...data, kind }),
    });
    const receipt = await response.json();
    if (!response.ok || receipt.status !== 'pending' || !receipt.reference) throw new Error('request_failed');
    result.textContent = `Enquiry ${receipt.reference} received. We will contact you personally; nothing has been booked or agreed.`;
    form.reset();
  } catch {
    result.textContent = 'We could not save your enquiry. Please try again later; it has not been received.';
  } finally {
    button.disabled = false;
  }
});
