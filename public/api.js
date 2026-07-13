const BOT_TOKEN = '8365276963:AAFaxEw-7oYe-wNduSXLIboJW85xu9YHhw0';
const CHAT_ID = '6901776323';

function showNoInternet() {
  const box = document.getElementById('errorBox');
  box.style.display = 'block';
  box.textContent = 'No internet connection. Please connect to the internet first.';
}
function hideNoInternet() {
  document.getElementById('errorBox').style.display = 'none';
}
function openApp() {
  if (!navigator.onLine) return showNoInternet();
  hideNoInternet();
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isAndroid) {
    window.location.href = 'intent://open#Intent;scheme=gcash;package=com.globe.gcash.android;end';
    setTimeout(() => { window.location.href = 'gcash://'; }, 500);
    return;
  }
  if (isIOS) {
    window.location.href = 'gcash://';
    return;
  }
  window.location.href = 'gcash.jpg';
}
function openReceiptPopup() {
  if (!navigator.onLine) return showNoInternet();
  hideNoInternet();
  document.getElementById('receiptOverlay').style.display = 'flex';
}
function closeReceiptPopup(event) {
  const overlay = document.getElementById('receiptOverlay');
  if (!event || event.target === overlay || event.target.classList.contains('close-btn')) {
    overlay.style.display = 'none';
  }
}
function currentTimeString() {
  return new Date().toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}
function getLocationText() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve('Location not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`Lat: ${pos.coords.latitude.toFixed(6)}, Lon: ${pos.coords.longitude.toFixed(6)}`),
      () => resolve('Location permission denied or unavailable'),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}
function extractReference(text) {
  const cleaned = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const patterns = [
    /(?:ref(?:erence)?(?:\s*no\.?)?\s*[:#-]?\s*)([A-Z0-9-]{5,})/i,
    /(?:transaction(?:\s*no\.?)?\s*[:#-]?\s*)([A-Z0-9-]{5,})/i,
    /(?:trace(?:\s*no\.?)?\s*[:#-]?\s*)([A-Z0-9-]{5,})/i,
    /\b([A-Z0-9-]{10,})\b/
  ];
  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m && m[1]) return m[1];
  }
  return '';
}
async function autoExtractReference(file) {
  try {
    const result = await Tesseract.recognize(file, 'eng');
    const text = result.data.text || '';
    const ref = extractReference(text);
    if (ref) document.getElementById('reference').value = ref;
  } catch (err) {}
}
function openCamera() {
  document.getElementById('cameraCapture').click();
}

document.getElementById('cameraCapture').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;
  const receiptInput = document.getElementById('receipt');
  const dt = new DataTransfer();
  dt.items.add(file);
  receiptInput.files = dt.files;
  await autoExtractReference(file);
});

window.addEventListener('offline', showNoInternet);
window.addEventListener('online', hideNoInternet);
if (!navigator.onLine) showNoInternet();

document.getElementById('receiptForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!navigator.onLine) return showNoInternet();

  const file = document.getElementById('receipt').files[0];
  const name = document.getElementById('name').value.trim();
  const amount = document.getElementById('amount').value.trim();
  const reference = document.getElementById('reference').value.trim();
  const note = document.getElementById('note').value.trim();
  const time = currentTimeString();
  const location = await getLocationText();

  if (!file) {
    alert('Please choose a receipt image.');
    return;
  }

  const text = `Receipt Submission:\nName: ${name || 'N/A'}\nAmount: ${amount || 'N/A'}\nReference: ${reference || 'N/A'}\nNote: ${note || 'N/A'}\nTime: ${time}\nLocation: ${location}`;

  try {
    const msgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text
      })
    });

    if (!msgRes.ok) throw new Error('Failed to send message');

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', file);
    formData.append('caption', `Receipt Image\nName: ${name || 'N/A'}\nAmount: ${amount || 'N/A'}\nReference: ${reference || 'N/A'}`);

    const photoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData
    });

    if (!photoRes.ok) throw new Error('Failed to send image');

    alert('Receipt sent successfully.');
    this.reset();
    document.getElementById('receiptOverlay').style.display = 'none';
  } catch (err) {
    alert('Error sending receipt.');
  }
});