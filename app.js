/* Password Vault – jQuery SPA */
(function($){
  'use strict';

  const BACKEND = 'https://password-backend-fc0k.onrender.com';
  let jwt = null;
  let tmpToken = null;
  let items = [];

  // ======= Utilities =======
  const escapeHtml = (s) => $('<div>').text(String(s ?? '')).html();

  function toast(msg, type='ok', timeout=2800){
    const $t = $('<div class="toast">').addClass(type==='err'?'err':'ok').html(escapeHtml(msg));
    $('#toasts').append($t);
    setTimeout(()=>{ $t.fadeOut(200,()=> $t.remove()); }, timeout);
  }

  function api(path, options={}){
    const headers = options.headers || {};
    if (jwt) headers['Authorization'] = 'Bearer ' + jwt;
    return $.ajax({
      url: BACKEND + path,
      method: options.method || 'GET',
      data: options.data ? JSON.stringify(options.data) : undefined,
      contentType: options.data ? 'application/json' : undefined,
      headers
    }).fail((xhr)=>{
      if(xhr.status===401){ logout(); }
      const msg = xhr.responseJSON?.message || xhr.responseText || ('Fehler ' + xhr.status);
      toast(msg, 'err', 4000);
    });
  }

  function persistToken(token){
    jwt = token;
    if(token) localStorage.setItem('jwt', token);
    else localStorage.removeItem('jwt');
  }

  function requireAuthUI(){
    if(jwt) {
      $('#auth-section').attr('hidden', true);
      $('#vault-section').attr('hidden', false);
      $('#btn-logout').prop('hidden', false);
    } else {
      $('#auth-section').attr('hidden', false);
      $('#vault-section').attr('hidden', true);
      $('#btn-logout').prop('hidden', true);
    }
  }

  function logout(){
    persistToken(null);
    tmpToken = null;
    items = [];
    $('#vault-list').empty();
    requireAuthUI();
  }

  // ======= Auth Flow =======
  $('#form-login').on('submit', function(e){
    e.preventDefault();
    const email = $('#login-email').val().trim();
    const password = $('#login-password').val();
    if(!email || !password) return;

    api('/api/auth/login', { method:'POST', data:{ email, password } })
      .done((r)=>{
        tmpToken = r.tmpToken;
        if(!tmpToken) return toast('tmpToken fehlt', 'err');
        $('#totp-modal').removeAttr('hidden').attr('aria-hidden','false');
        $('#totp-code').val('').focus();
      });
  });

  $('#form-register').on('submit', function(e){
    e.preventDefault();
    const email = $('#reg-email').val().trim();
    const p1 = $('#reg-password').val();
    const p2 = $('#reg-password2').val();
    if(p1!==p2) return toast('Passwörter stimmen nicht überein', 'err');
    if(p1.length < 8) return toast('Passwort zu kurz (min. 8)', 'err');

    api('/api/auth/register', { method:'POST', data:{ email, password:p1 } })
      .done(()=>{ toast('Registrierung erfolgreich – jetzt anmelden.'); $('#tab-login').click(); });
  });

  $('#form-totp').on('submit', function(e){
    e.preventDefault();
    const code = $('#totp-code').val().trim();
    if(code.length!==6) return toast('Bitte 6-stelligen Code eingeben', 'err');
    api('/api/auth/totp-verify', { method:'POST', data:{ tmpToken, code } })
      .done((r)=>{
        if(!r.token) return toast('Token fehlt', 'err');
        persistToken(r.token);
        $('#totp-modal').attr('hidden',true).attr('aria-hidden','true');
        requireAuthUI();
        loadVault();
      });
  });

  $(document).on('click','[data-action="cancel-totp"]', ()=>{ $('#totp-modal').attr('hidden',true).attr('aria-hidden','true'); });

  // Tabs
  $('.tab').on('click', function(){
    const tab = $(this).data('tab');
    $('.tab').removeClass('active').attr('aria-selected','false');
    $(this).addClass('active').attr('aria-selected','true');
    $('.tab-panel').removeClass('active').attr('hidden', true);
    $('#panel-'+tab).addClass('active').removeAttr('hidden');
  });

  // ======= Vault =======
  function renderItems(){
    const q = $('#search').val().toLowerCase().trim();
    const $list = $('#vault-list').empty();
    const tpl = document.getElementById('tpl-item');

    items
      .filter(it => !q || (it.title?.toLowerCase().includes(q) || it.username?.toLowerCase().includes(q) || it.url?.toLowerCase().includes(q)))
      .forEach(it => {
        const node = tpl.content.cloneNode(true);
        const $item = $(node).find('.item');
        $item.attr('data-id', it.id);
        $item.find('.title').text(it.title || '—');
        $item.find('.meta').text(it.url || '');
        $item.find('.user').text(it.username || '—');
        $item.find('.pass').data('value', it.password || '');
        $item.find('.url').html(it.url ? `<a href="{it.url}" target="_blank" rel="noopener"></a>` : '<span class="muted">—</span>');
        if (it.url) $item.find('.url a').text(it.url);
        $item.find('.notes').text(it.notes || '—');

        // Fill edit fields
        $item.find('.e-title').val(it.title || '');
        $item.find('.e-username').val(it.username || '');
        $item.find('.e-password').val(it.password || '');
        $item.find('.e-url').val(it.url || '');
        $item.find('.e-notes').val(it.notes || '');

        $list.append(node);
      });

    if($list.children().length===0){
      $list.append('<div class="card smallmuted">Keine Einträge gefunden.</div>');
    }
  }

  function loadVault(){
    api('/api/vault').done((arr)=>{
      items = Array.isArray(arr) ? arr : [];
      renderItems();
    });
  }

  // Create
  $('#form-create').on('submit', function(e){
    e.preventDefault();
    const data = {
      title: $('#new-title').val().trim(),
      username: $('#new-username').val().trim(),
      password: $('#new-password').val(),
      url: $('#new-url').val().trim(),
      notes: $('#new-notes').val().trim()
    };
    api('/api/vault', { method:'POST', data }).done((it)=>{
      toast('Gespeichert');
      $('#form-create')[0].reset();
      items.unshift(it);
      renderItems();
    });
  });

  // Delete
  $(document).on('click','[data-action="delete"]', function(){
    const id = $(this).closest('.item').data('id');
    if(!confirm('Diesen Eintrag wirklich löschen?')) return;
    api('/api/vault/'+encodeURIComponent(id), { method:'DELETE' }).done(()=>{
      items = items.filter(x=>x.id!==id);
      renderItems();
      toast('Gelöscht');
    });
  });

  // Edit toggle / save
  $(document).on('click','[data-action="cancel-edit"]', function(){
    $(this).closest('.item').find('.edit-fields').attr('hidden',true);
  });

  $(document).on('dblclick','.item .row, .item .details', function(){
    $(this).closest('.item').find('.edit-fields').removeAttr('hidden');
  });

  $(document).on('click','[data-action="save-edit"]', function(){
    const $it = $(this).closest('.item');
    const id = $it.data('id');
    const data = {
      title: $it.find('.e-title').val().trim(),
      username: $it.find('.e-username').val().trim(),
      password: $it.find('.e-password').val(),
      url: $it.find('.e-url').val().trim(),
      notes: $it.find('.e-notes').val().trim()
    };
    api('/api/vault/'+encodeURIComponent(id), { method:'PUT', data }).done((updated)=>{
      const idx = items.findIndex(x=>x.id===id);
      if(idx>=0) items[idx] = updated;
      renderItems();
      toast('Aktualisiert');
    });
  });

  // Copy / toggle / open
  $(document).on('click','[data-action="copy-user"]', function(){
    const user = $(this).closest('.item').find('.user').text();
    navigator.clipboard.writeText(user).then(()=>toast('Benutzername kopiert'));
  });
  $(document).on('click','[data-action="copy-pass"]', function(){
    const pass = $(this).closest('.item').find('.pass').data('value') || '';
    navigator.clipboard.writeText(pass).then(()=>toast('Passwort kopiert'));
  });
  $(document).on('click','[data-action="toggle-pass"]', function(){
    const $p = $(this).closest('.item').find('.pass');
    const shown = $p.hasClass('shown');
    if(shown) { $p.removeClass('shown').addClass('masked').text('').attr('data-mask','••••••••'); }
    else { $p.removeClass('masked').addClass('shown').text($p.data('value') || ''); }
  });
  $(document).on('click','[data-action="open-url"]', function(){
    const href = $(this).closest('.item').find('.url a').attr('href');
    if(href) window.open(href, '_blank', 'noopener');
  });

  // Password generator
  function genPassword(len=16){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%*?+-_';
    let out='';
    for(let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }
  $(document).on('click','[data-action="gen-pass"]', function(){
    $('#new-password').val(genPassword());
  });
  $(document).on('click','[data-action="gen-pass-row"]', function(){
    $(this).closest('.password-wrap').find('input').val(genPassword());
  });

  // Search
  $('#search').on('input', function(){ renderItems(); });

  // Logout
  $('#btn-logout').on('click', logout);

  // ======= Init =======
  (function init(){
    const saved = localStorage.getItem('jwt');
    if(saved) { jwt = saved; }
    requireAuthUI();
    if(jwt) loadVault();
  })();

})(jQuery);
