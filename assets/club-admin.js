const tokenInput = document.querySelector('#admin-token');
const status = document.querySelector('#admin-status');
const list = document.querySelector('#admin-requests');
const apiOrigin = globalThis.TIRRENIA_CLUB_API_ORIGIN || '';
const clubExport = document.querySelector('#club-export');
let currentClubRequests = [];

function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timeToMinutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

async function updateRequest(id, payload) {
  const response = await fetch(`${apiOrigin}/api/v1/club/staff/updateVisitRequestStatus/${id}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenInput.value}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  status.textContent = response.ok ? 'Saved.' : 'Could not update request. Check the approved opening schedule, interval and seat capacity.';
  if (response.ok) await loadRequests();
}

async function loadRequests() {
  list.replaceChildren();
  currentClubRequests = [];
  clubExport.disabled = true;
  if (!apiOrigin) { status.textContent = 'Service unavailable.'; return; }
  const response = await fetch(`${apiOrigin}/api/v1/club/staff/listVisitRequests`, { headers: { authorization: `Bearer ${tokenInput.value}` }, cache: 'no-store' });
  if (!response.ok) { status.textContent = 'Could not load requests. Check your token.'; return; }
  const data = await response.json();
  currentClubRequests = data.requests;
  clubExport.disabled = false;
  status.textContent = `${data.requests.length} recent request(s).`;
  for (const request of data.requests) {
    const card = document.createElement('article');
    card.className = 'club-admin-card';
    const title = document.createElement('h2');
    title.textContent = `${request.visit_date} · ${request.name} · ${request.status}`;
    const details = document.createElement('p');
    details.textContent = `${request.party_size} seat(s), ${request.duration}, arrival ${request.arrival || 'unspecified'} · ${request.contact} · ${request.note || 'No note'} · ${request.reference}`;
    card.append(title, details);
    if (request.status === 'pending' || request.status === 'reviewing') {
      for (const next of ['reviewing', 'declined']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = next === 'reviewing' ? 'Mark reviewing' : 'Decline';
        button.addEventListener('click', () => updateRequest(request.id, { status: next }).catch(() => { status.textContent = 'Service unavailable.'; }));
        card.append(button);
      }
      const times = document.createElement('div');
      times.className = 'club-admin-times';
      const startLabel = document.createElement('label');
      startLabel.textContent = 'From ';
      const startInput = document.createElement('input');
      startInput.type = 'time';
      startInput.value = request.arrival || '';
      startLabel.append(startInput);
      const endLabel = document.createElement('label');
      endLabel.textContent = 'Until ';
      const endInput = document.createElement('input');
      endInput.type = 'time';
      endLabel.append(endInput);
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.textContent = 'Confirm seat';
      confirm.addEventListener('click', () => {
        const startMin = timeToMinutes(startInput.value);
        const endMin = timeToMinutes(endInput.value);
        if (startMin === null || endMin === null || endMin <= startMin) {
          status.textContent = 'Enter a valid start and end time before confirming.';
          return;
        }
        updateRequest(request.id, { status: 'confirmed', startMin, endMin }).catch(() => { status.textContent = 'Service unavailable.'; });
      });
      times.append(startLabel, endLabel, confirm);
      card.append(times);
    }
    list.append(card);
  }
}

document.querySelector('#admin-load').addEventListener('click', () => loadRequests().catch(() => { status.textContent = 'Service unavailable.'; }));
clubExport.addEventListener('click', async () => {
  try {
    const response = await fetch(`${apiOrigin}/api/v1/club/staff/listVisitRequests?all=1`, {
      headers: { authorization: `Bearer ${tokenInput.value}` }, cache: 'no-store',
    });
    if (!response.ok) throw new Error('export_failed');
    downloadJson((await response.json()).requests, 'tirrenia-club-requests.json');
  } catch { status.textContent = 'Could not export Club requests.'; }
});

const inquiryStatus = document.querySelector('#inquiry-status');
const inquiryList = document.querySelector('#inquiry-requests');
const inquiryExport = document.querySelector('#inquiry-export');
let currentInquiries = [];

async function loadInquiries() {
  inquiryList.replaceChildren();
  inquiryExport.disabled = true;
  currentInquiries = [];
  if (!apiOrigin) { inquiryStatus.textContent = 'Service unavailable.'; return; }
  const response = await fetch(`${apiOrigin}/api/v1/inquiries/staff/listInquiries`, {
    headers: { authorization: `Bearer ${tokenInput.value}` }, cache: 'no-store',
  });
  if (!response.ok) { inquiryStatus.textContent = 'Could not load enquiries. Check your token.'; return; }
  const data = await response.json();
  currentInquiries = data.inquiries;
  inquiryStatus.textContent = `${currentInquiries.length} recent enquiry(s).`;
  inquiryExport.disabled = false;
  for (const item of currentInquiries) {
    const card = document.createElement('article');
    card.className = 'club-admin-card';
    const title = document.createElement('h3');
    title.textContent = `${item.kind} · ${item.name} · ${item.status}`;
    const details = document.createElement('p');
    details.textContent = `${item.contact} · ${item.organization || 'No organization'} · ${item.preferred_date || 'No visit date'} · ${item.message || 'No message'} · ${item.reference}`;
    card.append(title, details);
    if (item.status === 'pending' || item.status === 'reviewing') {
      for (const next of ['reviewing', 'declined', 'closed']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = next;
        button.addEventListener('click', async () => {
          try {
            const response = await fetch(`${apiOrigin}/api/v1/inquiries/staff/updateInquiry/${item.id}`, {
              method: 'POST',
              headers: { authorization: `Bearer ${tokenInput.value}`, 'content-type': 'application/json' },
              body: JSON.stringify({ status: next }),
            });
            if (!response.ok) throw new Error('update_failed');
            await loadInquiries();
          } catch { inquiryStatus.textContent = 'Could not update enquiry.'; }
        });
        card.append(button);
      }
    }
    inquiryList.append(card);
  }
}

document.querySelector('#inquiry-load').addEventListener('click', () => loadInquiries().catch(() => { inquiryStatus.textContent = 'Service unavailable.'; }));
inquiryExport.addEventListener('click', async () => {
  try {
    const response = await fetch(`${apiOrigin}/api/v1/inquiries/staff/listInquiries?all=1`, {
      headers: { authorization: `Bearer ${tokenInput.value}` }, cache: 'no-store',
    });
    if (!response.ok) throw new Error('export_failed');
    downloadJson((await response.json()).inquiries, 'tirrenia-enquiries.json');
  } catch { inquiryStatus.textContent = 'Could not export enquiries.'; }
});
