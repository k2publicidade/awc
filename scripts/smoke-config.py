# -*- coding: utf-8 -*-
import json
import urllib.request
import urllib.parse
import http.cookiejar

base = 'http://localhost:3000'


def login(email, senha):
    jar = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    csrf = json.loads(op.open(base + '/api/auth/csrf').read().decode())['csrfToken']
    body = urllib.parse.urlencode({'csrfToken': csrf, 'email': email, 'password': senha, 'json': 'true'}).encode()
    op.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}))
    return op


admin = login('admin@awc.com.br', 'admin123')

# 1. pagina configuracoes
r = admin.open(base + '/configuracoes', timeout=120)
print('page /configuracoes', r.status, len(r.read()))

# 2. listar usuarios (admin)
us = json.loads(admin.open(base + '/api/usuarios').read().decode())
print('usuarios:', len(us))

# 3. criar usuario via register autenticado como admin
payload = {'name': 'Usuario Smoke', 'email': 'smoke@awc.com.br', 'password': 'smoke123',
           'confirmPassword': 'smoke123', 'role': 'ENCARREGADO'}
try:
    r = admin.open(urllib.request.Request(base + '/api/auth/register', data=json.dumps(payload).encode(),
                   headers={'Content-Type': 'application/json'}))
    novo = json.loads(r.read().decode())
    print('criado:', novo['email'])
except Exception as e:
    print('FAIL criar:', e, e.read().decode()[:200] if hasattr(e, 'read') else '')
    novo = None

# 4. registro anonimo deve ser bloqueado (403)
anon = urllib.request.build_opener()
try:
    anon.open(urllib.request.Request(base + '/api/auth/register',
              data=json.dumps({'name': 'Hacker', 'email': 'h@h.com', 'password': '123456',
                               'confirmPassword': '123456', 'role': 'SUPER_ADMIN'}).encode(),
              headers={'Content-Type': 'application/json'}))
    print('FAIL: registro anonimo permitido!')
except urllib.error.HTTPError as e:
    print('registro anonimo bloqueado:', e.code)

# 5. PATCH desativar/reativar usuario criado
if novo:
    r = admin.open(urllib.request.Request(base + '/api/usuarios',
                   data=json.dumps({'id': novo['id'], 'isActive': False}).encode(),
                   headers={'Content-Type': 'application/json'}, method='PATCH'))
    print('desativado:', json.loads(r.read().decode())['isActive'] is False)

# 6. listar usuarios como nao-admin deve dar 403
enc = login('encarregado@awc.com.br', 'admin123')
try:
    enc.open(base + '/api/usuarios')
    print('FAIL: nao-admin listou usuarios')
except urllib.error.HTTPError as e:
    print('nao-admin bloqueado:', e.code)

# limpeza: remover usuario smoke direto via prisma nao da; manter desativado é ok
print('done')
