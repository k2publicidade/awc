# -*- coding: utf-8 -*-
# Smoke test do acesso restrito: admin novo entra, senha errada falha, rotas exigem sessão.
import json
import urllib.request
import urllib.parse
import http.cookiejar

base = 'http://localhost:3000'

ADMIN_EMAIL = 'admin@awcpremoldados.com.br'
ADMIN_PASS = 'awc@2026'

fails = 0
def check(name, ok, extra=''):
    global fails
    if not ok:
        fails += 1
    print(('OK  ' if ok else 'FAIL'), name, extra)

def new_session():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

def try_login(op, email, password):
    csrf = json.loads(op.open(base + '/api/auth/csrf').read().decode())['csrfToken']
    body = urllib.parse.urlencode({'csrfToken': csrf, 'email': email, 'password': password, 'json': 'true'}).encode()
    try:
        op.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}))
    except urllib.error.HTTPError:
        pass
    sess = json.loads(op.open(base + '/api/auth/session').read().decode())
    return sess.get('user')

# 1. Sem sessão: /dashboard redireciona para /login
op = new_session()
r = op.open(base + '/dashboard')
check('sem sessão: /dashboard cai no /login', '/login' in r.geturl(), f"-> {r.geturl()}")

# 2. Sem sessão: API protegida nega
try:
    op.open(base + '/api/usuarios')
    check('sem sessão: /api/usuarios bloqueada', False, '(respondeu 200)')
except urllib.error.HTTPError as e:
    check('sem sessão: /api/usuarios bloqueada', e.code in (302, 307, 401, 403), f"({e.code})")

# 3. Login com senha errada falha
op = new_session()
user = try_login(op, ADMIN_EMAIL, 'senha-errada')
check('senha errada: sessão não criada', not user)

# 4. Login do admin novo funciona
op = new_session()
user = try_login(op, ADMIN_EMAIL, ADMIN_PASS)
check('admin novo: login ok', bool(user and user.get('email') == ADMIN_EMAIL), f"role={user.get('role') if user else None}")
check('admin novo: SUPER_ADMIN', bool(user and user.get('role') == 'SUPER_ADMIN'))

# 5. Com sessão: dashboard e API de admin acessíveis
r = op.open(base + '/dashboard')
check('admin novo: /dashboard acessível', r.status == 200 and '/login' not in r.geturl())
usuarios = json.loads(op.open(base + '/api/usuarios').read().decode())
check('admin novo: /api/usuarios responde', isinstance(usuarios, list), f"({len(usuarios) if isinstance(usuarios, list) else '?'} usuários)")

# 6. Página de login limpa: sem credenciais demo e sem botão Google
raw = new_session().open(base + '/login').read().decode(errors='replace')
check('login: sem senha demo pré-preenchida', 'admin123' not in raw and 'admin@awc.com.br' not in raw)
check('login: sem botão Google (OAuth não configurado)', 'Entrar com Google' not in raw)
check('login: aviso de acesso restrito', 'Acesso restrito' in raw)

print('RESULT:', 'PASS' if fails == 0 else f'{fails} FAIL')
