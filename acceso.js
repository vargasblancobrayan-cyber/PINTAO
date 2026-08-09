document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s);
  const roleBtns = document.querySelectorAll('[data-role]');
  const form = $('#accessForm');
  const submit = $('#accessSubmit');
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

  function applyRole(next) {
    role = next;
    roleBtns.forEach(b => {
      const on = b.dataset.role === next;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    // El admin solo inicia sesión (no se crea cuenta desde aquí).
    if (role === 'admin') setMode('login', true);
    $('#accessEyebrow').textContent = role === 'admin' ? 'ACCESO ADMINISTRATIVO' : 'INICIAR SESIÓN';
    $('#accessTitle').textContent = role === 'admin' ? 'Acceso administrador' : (mode === 'login' ? 'Acceso cliente' : 'Crear cuenta de cliente');
    $('#accessHint').textContent = role === 'admin'
      ? 'Área protegida para gestionar productos, pedidos y configuración.'
      : (mode === 'login' ? 'Ingresa con tu cuenta de comprador PINTAO.' : 'Registra tu cuenta para comprar y seguir tus pedidos.');
    renderDemo();
  }

  function setMode(next, force) {
    if (role === 'admin' && !force) return;
    mode = next;
    const isLogin = mode === 'login';
    $('#nameField').hidden = isLogin;
    $('#typeField').hidden = isLogin;
    form.elements.password.autocomplete = isLogin ? 'current-password' : 'new-password';
    submit.textContent = role === 'admin' ? 'ENTRAR AL PANEL' : (isLogin ? 'INGRESAR' : 'CREAR CUENTA');
    toggleText.textContent = isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
    toggleBtn.textContent = isLogin ? 'CREAR CUENTA' : 'INICIAR SESIÓN';
    toggleBtn.hidden = role === 'admin';
    $('#accessTitle').textContent = role === 'admin' ? 'Acceso administrador' : (isLogin ? 'Acceso cliente' : 'Crear cuenta de cliente');
    $('#accessHint').textContent = role === 'admin'
      ? 'Área protegida para gestionar productos, pedidos y configuración.'
      : (isLogin ? 'Ingresa con tu cuenta de comprador PINTAO.' : 'Registra tu cuenta para comprar y seguir tus pedidos.');
    error.textContent = '';
  }

  roleBtns.forEach(b => b.onclick = () => { if (b.dataset.role !== role) applyRole(b.dataset.role); });
  toggleBtn.onclick = () => setMode(mode === 'login' ? 'register' : 'login');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    error.textContent = '';
    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = 'PROCESANDO…';
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
      submit.disabled = false;
      submit.textContent = original;
    }
  });

  applyRole('customer');
  redirectIfSession();
});
