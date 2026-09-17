const form = document.querySelector('#club-booking-form');
const result = document.querySelector('#club-result');
const dateInput = document.querySelector('#club-date');
const apiOrigin = globalThis.TIRRENIA_CLUB_API_ORIGIN || '';

function amsterdamToday() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

dateInput.min = amsterdamToday();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.textContent = '';
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  data.partySize = Number(data.partySize);
  if (!data.name?.trim() || !data.contact?.trim() || !data.date || !data.duration ||
    !Number.isInteger(data.partySize) || data.partySize < 1 || data.partySize > 10) {
    result.textContent = 'Please complete your name, contact, preferred day, duration and number of seats.';
    return;
  }
  const day = new Date(`${data.date}T12:00:00Z`).getUTCDay();
  if (![1, 2, 4, 5].includes(day) || data.date < amsterdamToday()) {
    result.textContent = 'Please choose a future Monday, Tuesday, Thursday or Friday.';
    return;
  }
  button.disabled = true;
  result.textContent = 'Sending your request…';
  try {
    if (!apiOrigin) throw new Error('service_unavailable');
    const response = await fetch(`${apiOrigin}/api/v1/club/public/createVisitRequest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const receipt = await response.json();
    if (!response.ok || receipt.status !== 'pending') throw new Error('request_failed');
    result.textContent = `Request ${receipt.reference} received. It is pending personal confirmation; please do not visit until Joseph confirms your day and time.`;
    form.reset();
  } catch {
    result.textContent = 'We could not save your request. Please try again later; no request or seat has been confirmed.';
  } finally {
    button.disabled = false;
  }
});
