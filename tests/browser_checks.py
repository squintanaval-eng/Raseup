"""Regression suite: actual repository frontend with deterministic mocked Supabase.
No production accounts, email or database mutations. Run from a clean checkout:
  pip install playwright==1.57.0
  playwright install chromium
  python tests/browser_checks.py
"""
import http.server
import json
import os
from pathlib import Path
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
os.chdir(ROOT)
server = socketserver.TCPServer(('127.0.0.1', 0), Quiet)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_address[1]}/'
checks = []
def passed(name, condition=True):
    assert condition, name
    checks.append(name)
    print('PASS', name, flush=True)

with sync_playwright() as engine:
    browser = engine.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, reduced_motion='reduce')
    context.add_init_script(path=str(ROOT / 'tests/mock-supabase.js'))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.dismiss())
    page.goto(url)
    page.wait_for_function("window.ReuseProgress && !document.getElementById('saveName').disabled")
    passed('guest startup', page.evaluate("ReuseProgress.owner === 'guest'"))
    page.screenshot(path=str(OUT / 'desktop.png'), full_page=True)
    page.evaluate("mostrar('personaje')")
    page.fill('#nombre', 'Invitado local')
    page.click('#saveName')
    page.evaluate("for(let i=0;i<6;i++){responderEco(preguntasEco[preguntaEcoActual][3]);siguienteEcoPregunta();}")
    passed('quiz daily cap', page.evaluate("ReuseProgress.get().puntos===50 && ReuseProgress.get().ecoquiz.puntosHoy===50"))
    page.reload()
    page.wait_for_function("!document.getElementById('saveName').disabled")
    passed('guest persists after reload', page.evaluate("ReuseProgress.get().nombre==='Invitado local' && ReuseProgress.get().puntos===50"))
    page.evaluate("mostrar('cuenta')")
    page.fill('#cuentaCorreo', 'a@example.test')
    page.fill('#cuentaClave', 'test-only-password')
    page.click('#authSubmit')
    page.wait_for_function("ReuseProgress.owner==='account-a' && !document.getElementById('saveName').disabled")
    passed('first login does not import guest points', page.evaluate("ReuseProgress.get().puntos===0 && ReuseProgress.get().nombre==='Reciclador A'"))
    page.evaluate("mostrar('personaje')")
    page.fill('#nombre', 'Alias nube')
    page.click('#saveName')
    page.evaluate("cambiarAvatar('cactus');responderEco(preguntasEco[preguntaEcoActual][3]);")
    page.wait_for_function("mock.db['account-a'].nombre==='Alias nube' && mock.db['account-a'].puntos===10 && mock.db['account-a'].ecoquiz.puntosHoy===10")
    passed('cloud saves name avatar quiz points', page.evaluate("mock.db['account-a'].personaje==='cactus'"))
    page.reload()
    page.wait_for_function("ReuseProgress.owner==='account-a' && !document.getElementById('saveName').disabled")
    passed('cloud restores full profile', page.evaluate("ReuseProgress.get().puntos===10 && ReuseProgress.get().nombre==='Alias nube' && ReuseProgress.get().ecoquiz.puntosHoy===10"))
    page.evaluate("mostrar('cuenta')")
    page.click('#cuentaSalir')
    page.wait_for_function("ReuseProgress.owner==='guest'")
    passed('logout restores guest separately', page.evaluate("ReuseProgress.get().puntos===50 && ReuseProgress.get().nombre==='Invitado local'"))
    page.fill('#cuentaCorreo', 'b@example.test')
    page.fill('#cuentaClave', 'test-only-password')
    page.click('#authSubmit')
    page.wait_for_function("ReuseProgress.owner==='account-b' && !document.getElementById('saveName').disabled")
    passed('second account isolated', page.evaluate("ReuseProgress.get().puntos===0 && ReuseProgress.get().nombre==='Reciclador B'"))
    page.evaluate("mock.offline=true;sumar(20)")
    page.wait_for_function("!document.getElementById('retrySync').hidden")
    passed('failed save remains pending', page.evaluate("mock.db['account-b'].puntos===0 && JSON.parse(localStorage.getItem('reuseup-account-v2:account-b')).dirty"))
    page.evaluate('mock.offline=false')
    page.click('#retrySync')
    page.wait_for_function("mock.db['account-b'].puntos===20")
    passed('retry persists pending changes')
    page.evaluate("mock.db['account-b'].revision+=1;mock.db['account-b'].nombre='Otro dispositivo';mock.persist();sumar(10)")
    page.wait_for_function("!document.getElementById('cloudConflict').hidden")
    passed('stale update does not overwrite cloud', page.evaluate("mock.db['account-b'].puntos===20 && mock.db['account-b'].nombre==='Otro dispositivo'"))
    page.click('#reloadCloud')
    page.wait_for_function("ReuseProgress.get().nombre==='Otro dispositivo' && !document.getElementById('saveName').disabled")
    passed('conflict backup retained', page.evaluate("!!localStorage.getItem('reuseup-conflict-backup:account-b')"))
    page.evaluate("mock.emit('PASSWORD_RECOVERY',{user:mock.user('account-b')})")
    page.wait_for_selector('#resetForm', state='visible')
    page.fill('#newPassword', 'new-test-password')
    page.fill('#repeatPassword', 'new-test-password')
    page.click('#resetSubmit')
    page.wait_for_function("mock.calls.password===1 && document.getElementById('resetForm').hidden")
    passed('password recovery form calls updateUser')
    page.click('#cuentaSalir')
    page.wait_for_function("ReuseProgress.owner==='guest'")
    page.evaluate("mock.loginError={code:'email_not_confirmed'}")
    page.fill('#cuentaCorreo', 'a@example.test')
    page.fill('#cuentaClave', 'test-only-password')
    page.click('#authSubmit')
    page.wait_for_function("document.getElementById('cuentaMensaje').textContent.includes('Confirma tu correo')")
    passed('unconfirmed email explained')
    page.evaluate("mock.mailError={code:'over_email_send_rate_limit',status:429}")
    page.click('#resendConfirmation')
    page.wait_for_function("document.getElementById('resendConfirmation').disabled")
    passed('email rate limit and cooldown', page.evaluate("document.getElementById('cuentaMensaje').textContent.includes('limitado')"))
    page.evaluate("localStorage.removeItem('reuseup-mail-cooldown-v2')")
    page.reload()
    page.wait_for_function("!document.getElementById('authSubmit').disabled")
    page.evaluate("mostrar('cuenta')")
    page.click('[data-auth-mode="register"]')
    page.fill('#cuentaNombre', 'Nuevo alias')
    page.fill('#cuentaCorreo', 'new@example.test')
    page.fill('#cuentaClave', 'register-password')
    page.fill('#confirmClave', 'different-password')
    page.click('#authSubmit')
    passed('password mismatch blocked', page.evaluate('mock.calls.signup===0'))
    page.fill('#confirmClave', 'register-password')
    page.click('#authSubmit')
    page.wait_for_function("mock.calls.signup===1 && document.getElementById('cuentaClave').value===''")
    passed('signup supplies redirect and clears password', page.evaluate("mock.lastRedirect.endsWith('?auth=confirm')"))
    for width in (1440, 768, 390, 320):
        page.set_viewport_size({'width': width, 'height': 900})
        for section in ('inicio', 'escaner', 'retos', 'planeta', 'personaje', 'ranking', 'cuenta'):
            page.evaluate('mostrar', section)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), (width, section, 'horizontal overflow')
        passed(f'all sections fit {width}px')
        if width == 390:
            page.screenshot(path=str(OUT / 'account-mobile.png'), full_page=True)
            page.evaluate("mostrar('inicio')")
            page.screenshot(path=str(OUT / 'home-mobile.png'), full_page=True)
    passed('no browser JavaScript errors', not errors)
    browser.close()
server.shutdown()
(OUT / 'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'mocked_supabase':True,'errors':errors},indent=2),encoding='utf8')
