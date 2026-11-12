"""Actual ReuseUp DOM; mock only Auth and /api/chat, never use real API keys."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
import json
import os

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
OUT = ROOT / 'test-results' / 'chat'
OUT.mkdir(parents=True, exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), Quiet)
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'
results = []
def check(label, condition):
    assert condition, label
    results.append(label)
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width':1440,'height':1100}, reduced_motion='reduce')
    context.grant_permissions(['clipboard-read','clipboard-write'])
    # Auth is not under test. All gameplay, theme, navigation and chat code are real.
    context.route('**/auth.js', lambda r:r.fulfill(content_type='application/javascript',body='ReuseProgress.lock(false); document.getElementById("cuentaEstado").textContent="Modo invitado";'))
    page = context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    calls=[]
    mode={'value':'ok'}
    def api(route):
        calls.append(route.request.post_data_json)
        if mode['value']=='error':
            route.fulfill(status=502,content_type='application/json',body=json.dumps({'error':'No se pudo conectar con la IA.'}))
        elif mode['value']=='xss':
            route.fulfill(content_type='application/json',body=json.dumps({'reply':'<img src=x onerror="window.chatXSS=true">'}))
        elif mode['value']=='hold':
            route.abort('failed')
        else:
            route.fulfill(content_type='application/json',body=json.dumps({'reply':'Empieza con papel limpio. Separa los materiales segun tu localidad.'}))
    page.route('**/api/chat',api)
    page.on('dialog',lambda d:d.accept())
    page.goto(url)
    page.wait_for_selector('#chat',state='attached')
    page.wait_for_function('getComputedStyle(document.querySelector(".sidebar")).backgroundColor === "rgb(18, 61, 50)"')
    page.screenshot(path=str(OUT/'home-desktop.png'),full_page=True)
    check('all seven navigation destinations available',page.locator('.menu [data-page]').count()==7)
    page.locator('[data-page="chat"]').click()
    check('chat opens through navigation',page.locator('#chat').evaluate('(el)=>el.classList.contains("activa")'))
    check('blank send disabled',page.locator('#chatSend').is_disabled())
    page.locator('[data-chat-prompt]').first.click()
    check('suggestion prefills without sending',len(calls)==0 and bool(page.locator('#chatInput').input_value()))
    page.screenshot(path=str(OUT/'chat-desktop.png'),full_page=True)
    page.locator('#chatInput').press('Enter')
    page.wait_for_function('document.querySelectorAll(".chat-message.assistant:not(.is-thinking)").length === 1')
    check('first message and answer shown',page.locator('.chat-message').count()==2)
    check('payload starts with user message',calls[0]['messages'][0]['role']=='user')
    page.locator('#chatInput').fill('Y las latas?')
    page.locator('#chatInput').press('Shift+Enter')
    check('shift enter inserts newline without sending',len(calls)==1 and '\n' in page.locator('#chatInput').input_value())
    page.locator('#chatSend').click()
    page.wait_for_function('document.querySelectorAll(".chat-message.assistant:not(.is-thinking)").length === 2')
    check('follow-up includes context',len(calls[-1]['messages'])==3 and calls[-1]['messages'][1]['role']=='assistant')
    page.locator('#chatCopy').click()
    check('copy conversation works','copiada' in page.locator('#chatNotice').inner_text())
    mode['value']='error'
    page.locator('#chatInput').fill('Como ahorro agua?')
    page.locator('#chatSend').click()
    page.wait_for_selector('.chat-retry')
    check('server failure has retry control',page.locator('.chat-error').count()==1)
    users=page.locator('.chat-message.user').count()
    mode['value']='ok';page.locator('.chat-retry').click()
    page.wait_for_function('document.querySelectorAll(".chat-message.assistant:not(.is-thinking)").length === 3')
    check('retry does not duplicate user message',page.locator('.chat-message.user').count()==users)
    check('retry does not add errors to model history',len(calls[-1]['messages'])==5)
    mode['value']='xss';page.locator('#chatInput').fill('Prueba de texto')
    page.locator('#chatSend').click()
    page.wait_for_function('document.querySelector("#chatMessages").textContent.includes("<img")')
    check('AI output cannot execute HTML',not page.evaluate('Boolean(window.chatXSS)') and page.locator('#chatMessages img').count()==0)
    # A held promise allows deterministic cancellation and reset race tests.
    page.evaluate('window.realChatFetch=window.fetch;window.fetch=(url,opts)=>url==="/api/chat"?new Promise((resolve,reject)=>opts.signal.addEventListener("abort",()=>reject(new DOMException("Stopped","AbortError")))):window.realChatFetch(url,opts)')
    page.locator('#chatInput').fill('Lento');page.locator('#chatSend').click()
    check('stop visible while busy',page.locator('#chatStop').is_visible())
    page.locator('#chatStop').click();page.wait_for_selector('.chat-retry')
    check('stop restores editable form',not page.locator('#chatInput').is_disabled())
    page.locator('#chatInput').fill('Otra solicitud');page.locator('#chatSend').click()
    page.locator('#chatNew').click();page.wait_for_timeout(100)
    check('new chat cancels safely without stale reply',page.locator('.chat-message').count()==0 and page.locator('#chatWelcome').is_visible())
    page.evaluate('window.fetch=window.realChatFetch');mode['value']='ok'
    page.locator('#chatInput').fill('Hola');page.locator('#chatSend').click()
    page.wait_for_function('document.querySelectorAll(".chat-message.assistant:not(.is-thinking)").length === 1')
    page.evaluate('ReuseProgress.apply({},"test-other-owner")')
    check('account change clears chat history',page.locator('.chat-message').count()==0 and page.locator('#chatCopy').is_disabled())
    page.locator('#chatToScanner').click()
    check('scanner navigation still works',page.locator('#escaner').evaluate('(el)=>el.classList.contains("activa")'))
    page.locator('[data-page="chat"]').click()
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        page.wait_for_timeout(100)
        check(f'no horizontal overflow at {width}px',page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        check(f'composer fits at {width}px',page.locator('#chatForm').bounding_box()['width'] <= width)
        page.screenshot(path=str(OUT/f'chat-{width}.png'),full_page=True)
    page.reload();page.wait_for_selector('#chat',state='attached');page.locator('[data-page="chat"]').click()
    check('reload starts fresh temporary conversation',page.locator('.chat-message').count()==0)
    check('no browser exceptions',not errors)
    (OUT/'results.json').write_text(json.dumps({'passed':len(results),'checks':results,'errors':errors},indent=2),encoding='utf-8')
    print(json.dumps({'passed':len(results),'checks':results}))
    browser.close()
server.shutdown()
