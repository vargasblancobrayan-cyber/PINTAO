document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s);
  const roleBtns = document.querySelectorAll('[data-role]');
  const form = $('#accessForm');
  const fieldsWrap = $('#accessFields');
  const error = $('#accessError');
  const toggleBtn = $('#toggleMode');
  const toggleText = $('#toggleText');
  const demoBox = $('#accessDemo');

  let role = 'customer';
  let mode = 'login';

  // Si ya hay sesión activa, redirigir al área correspondiente.
  async function redirectIfSession() {
    try {
      const r = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (r.ok) { location.href = '/admin'; return true; }
    } catch {}
    try {
      const r = await fetch('/api/account', { credentials: 'same-origin' });
      if (r.ok) { location.href = '/cuenta'; return true; }
    } catch {}
    return false;
  }

  function renderDemo() {
    if (role === 'customer') {
      demoBox.innerHTML = '<span>Cuenta demo:</span><code>cliente@pintao.local</code><code>Cliente2026!</code>';
    } else {
      demoBox.innerHTML = '<span>Cuenta demo:</span><code>admin@pintao.local</code><code>Pintao2026!</code>';
    }
  }

  // Reconstruye los campos del formulario según el modo.
  // Login (por defecto): solo correo + contraseña. Registro: añade nombre y tipo.
  function renderFields() {
    const isLogin = mode === 'login';
    const extra = isLogin ? '' :
      '<label class="field wide">NOMBRE O EMPRESA<input name="name" autocomplete="name" required></label>' +
      '<label class="field wide">TIPO DE COMPRADOR<select name="type"><option>Persona natural</option><option>Empresa</option></select></label>';
    fieldsWrap.innerHTML = extra +
      '<label class="field wide">CORREO ELECTRÓNICO<input name="email" type="email" autocomplete="email" required></label>' +
      '<label class="field wide">CONTRASEÑA<input name="password" type="password" minlength="8" autocomplete="' +
      (isLogin ? 'current-password' : 'new-password') + '" required></label>' +
      '<div class="field wide access-actions"><button class="button dark full" type="submit" id="accessSubmit">' +
      (role === 'admin' ? 'ENTRAR AL PANEL' : (isLogin ? 'INGRESAR' : 'CREAR CUENTA')) + '</button></div>';
  }

  function applyRole(next) {
    role = next;
    roleBtns.forEach(b => {
      const on = b.dataset.role === next;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    if (role === 'admin') setMode('login', true);
    updateCopy();
    renderDemo();
  }

  function updateCopy() {
    const isLogin = mode === 'login';
    $('#accessEyebrow').textContent = role === 'admin' ? 'ACCESO ADMINISTRATIVO' : (isLogin ? 'INICIAR SESIÓN' : 'REGISTRO');
    $('#accessTitle').textContent = role === 'admin' ? 'Acceso administrador' : (isLogin ? 'Acceso cliente' : 'Crear cuenta');
    $('#accessHint').textContent = role === 'admin'
      ? 'Ingresa tu correo y contraseña de administrador.'
      : (isLogin ? 'Ingresa con tu correo y contraseña.' : 'Completa tus datos para crear una cuenta de comprador.');
    toggleText.textContent = isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
    toggleBtn.textContent = isLogin ? 'CREAR CUENTA' : 'INICIAR SESIÓN';
    toggleBtn.hidden = role === 'admin';
  }

  function setMode(next, force) {
    if (role === 'admin' && !force) return;
    mode = next;
    renderFields();
    updateCopy();
    error.textContent = '';
  }

  roleBtns.forEach(b => b.onclick = () => { if (b.dataset.role !== role) applyRole(b.dataset.role); });
  toggleBtn.onclick = () => setMode(mode === 'login' ? 'register' : 'login');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    error.textContent = '';
    const btn = form.querySelector('#accessSubmit');
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'PROCESANDO…';
    const values = Object.fromEntries(new FormData(form));
    try {
      if (role === 'admin') {
        const r = await fetch('/api/admin/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', body: JSON.stringify({ email: values.email, password: values.password })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'No fue posible ingresar');
        location.href = '/admin';
      } else {
        const path = mode === 'login' ? '/login' : '/register';
        await Punto.api(path, { method: 'POST', body: JSON.stringify(values) });
        Punto.toast(mode === 'login' ? 'Sesión iniciada' : 'Cuenta creada correctamente');
        location.href = '/cuenta';
      }
    } catch (err) {
      error.textContent = err.message || 'Ocurrió un error. Intenta nuevamente.';
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  renderFields();
  updateCopy();
  renderDemo();
  redirectIfSession();
});
