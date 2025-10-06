/* global $, localStorage */
const state = {
  baseUrl: localStorage.getItem('https://password-backend-fc0k.onrender.com') || '',
  token: localStorage.getItem('jwt') || null,
  tmpToken: null,
  items: []
};

function toast(msg, ok=true) {
  const $t = $('#toast');
  $t.text(msg).removeClass('hidden');
  $t.css('background', ok ? '#0f172a' : '#b91c1c');
  setTimeout(()=> $t.addClass('hidden'), 2500);
}

function applyAuthHeader() {
  $.ajaxSetup({
    beforeSend: (xhr) => {
      if (state.token) xhr.setRequestHeader('Authorization', 'Bearer ' + state.token);
    }
  });
}

function api(path) {
  if (!state.baseUrl) throw new Error('Backend-URL ist nicht gesetzt');
  return state.baseUrl.replace(/\/+$/,'') + path;
}

function toggleLoggedInUI() {
  if (state.token) {
    $('#btnLogin').addClass('hidden');
    $('#btnLogout').removeClass('hidden');
    $('#vaultSection').removeClass('hidden');
    $('#intro').addClass('hidden');
  } else {
    $('#btnLogin').removeClass('hidden');
    $('#btnLogout').addClass('hidden');
    $('#vaultSection').addClass('hidden');
    $('#intro').removeClass('hidden');
  }
}

function renderItems(items) {
  const q = ($('#search').val() || '').toLowerCase().trim();
  const filter = (it) => !q || Object.values(it).some(v => (''+v).toLowerCase().includes(q));
  const rows = (items || []).filter(filter).map(it => `
    <tr>
      <td class="td font-medium">${escapeHtml(it.title || '')}</td>
      <td class="td">${escapeHtml(it.username || '')}</td>
      <td class="td"><span class="password-dot">${mask(it.password || '')}</span></td>
      <td class="td"><a class="text-brand-700 hover:underline" href="${escapeAttr(it.url || '#')}" target="_blank" rel="noopener">${escapeHtml(it.url || '')}</a></td>
      <td class="td">${escapeHtml(it.notes || '')}</td>
      <td class="td">
        <button class="btn-secondary mr-2" data-edit="${it.id}">Bearbeiten</button>
        <button class="btn-secondary" data-del="${it.id}">Löschen</button>
      </td>
    </tr>`).join('');
  $('#vaultTbody').html(rows || '<tr><td class="td" colspan="6">Keine Einträge.</td></tr>');
}

function mask(s) { return s ? '•'.repeat(Math.min(12, s.length || 6)) : ''; }
function escapeHtml(s) { return (s+'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

function register(email, password) {
  return $.ajax({
    url: api('/auth/register'),
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ email, password })
  });
}

function login(email, password) {
  return $.ajax({
    url: api('/auth/login'),
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ email, password })
  });
}

function totpVerify(tmpToken, code) {
  return $.ajax({
    url: api('/auth/totp-verify'),
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ tmpToken, code })
  });
}

function loadVault() {
  return $.ajax({ url: api('/vault'), method: 'GET' })
    .done(items => {
      state.items = items || [];
      renderItems(state.items);
    });
}

function createItem(payload) {
  return $.ajax({
    url: api('/vault'),
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(payload)
  });
}

function updateItem(id, payload) {
  return $.ajax({
    url: api('/vault/' + id),
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(payload)
  });
}

function deleteItem(id) {
  return $.ajax({
    url: api('/vault/' + id),
    method: 'DELETE'
  });
}

$(document).ready(() => {
  applyAuthHeader();
  toggleLoggedInUI();
  if (!state.baseUrl) $('#dlgSettings')[0].showModal();

  $('#btnSettings').on('click', () => {
    $('#inpBaseUrl').val(state.baseUrl);
    $('#dlgSettings')[0].showModal();
  });
  $('#saveSettings').on('click', () => {
    const v = $('#inpBaseUrl').val().trim();
    state.baseUrl = v;
    localStorage.setItem('baseUrl', v);
    toast('Gespeichert ✓');
  });

  $('#btnLogin').on('click', () => $('#dlgLogin')[0].showModal());
  $('#openRegister').on('click', () => {
    $('#dlgLogin')[0].close();
    $('#dlgRegister')[0].showModal();
  });

  $('#doRegister').on('click', () => {
    const email = $('#regEmail').val().trim();
    const password = $('#regPassword').val();
    register(email, password)
      .done(() => { toast('Account erstellt ✓'); $('#dlgRegister')[0].close(); $('#dlgLogin')[0].showModal(); })
      .fail(xhr => toast(xhr.responseText || 'Registrierung fehlgeschlagen', false));
  });

  $('#doLogin').on('click', () => {
    const email = $('#loginEmail').val().trim();
    const password = $('#loginPassword').val();
    login(email, password)
      .done(({ tmpToken }) => {
        state.tmpToken = tmpToken;
        $('#dlgLogin')[0].close();
        $('#dlgTotp')[0].showModal();
      })
      .fail(xhr => toast(xhr.responseText || 'Login fehlgeschlagen', false));
  });

  $('#doTotp').on('click', () => {
    const code = $('#totpCode').val().trim();
    totpVerify(state.tmpToken, code)
      .done(res => {
        state.token = res.token;
        localStorage.setItem('jwt', state.token);
        applyAuthHeader();
        $('#dlgTotp')[0].close();
        toggleLoggedInUI();
        loadVault().then(()=> toast('Angemeldet ✓'));
      })
      .fail(xhr => toast(xhr.responseText || 'TOTP ungültig', false));
  });

  $('#btnLogout').on('click', () => {
    state.token = null;
    localStorage.removeItem('jwt');
    toggleLoggedInUI();
    toast('Abgemeldet');
  });

  $('#btnAdd').on('click', () => {
    $('#editTitle').text('Neuer Eintrag');
    $('#itemId').val('');
    $('#itemTitle, #itemUsername, #itemPassword, #itemUrl, #itemNotes').val('');
    $('#dlgEdit')[0].showModal();
  });

  $('#vaultTbody').on('click', 'button[data-edit]', (e) => {
    const id = $(e.currentTarget).data('edit');
    const it = state.items.find(x => x.id == id);
    if (!it) return;
    $('#editTitle').text('Eintrag bearbeiten');
    $('#itemId').val(it.id);
    $('#itemTitle').val(it.title || '');
    $('#itemUsername').val(it.username || '');
    $('#itemPassword').val(it.password || '');
    $('#itemUrl').val(it.url || '');
    $('#itemNotes').val(it.notes || '');
    $('#dlgEdit')[0].showModal();
  });

  $('#vaultTbody').on('click', 'button[data-del]', (e) => {
    const id = $(e.currentTarget).data('del');
    if (!confirm('Eintrag wirklich löschen?')) return;
    deleteItem(id)
      .done(() => { toast('Gelöscht ✓'); loadVault(); })
      .fail(xhr => toast(xhr.responseText || 'Löschen fehlgeschlagen', false));
  });

  $('#saveItem').on('click', () => {
    const id = $('#itemId').val();
    const payload = {
      title: $('#itemTitle').val(),
      username: $('#itemUsername').val(),
      password: $('#itemPassword').val(),
      url: $('#itemUrl').val(),
      notes: $('#itemNotes').val()
    };
    const req = id ? updateItem(id, payload) : createItem(payload);
    req.done(() => {
        $('#dlgEdit')[0].close();
        loadVault().then(()=> toast('Gespeichert ✓'));
      })
      .fail(xhr => toast(xhr.responseText || 'Speichern fehlgeschlagen', false));
  });

  $('#togglePw').on('click', () => {
    const el = $('#itemPassword')[0];
    el.type = el.type === 'password' ? 'text' : 'password';
  });

  $('#search').on('input', () => renderItems(state.items));

  $(document).ajaxError((_, xhr) => {
    if (xhr.status === 401) {
      state.token = null;
      localStorage.removeItem('jwt');
      toggleLoggedInUI();
      toast('Sitzung abgelaufen', false);
    }
  });

  if (state.token) loadVault();
});
