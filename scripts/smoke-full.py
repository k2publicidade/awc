# -*- coding: utf-8 -*-
"""Smoke test completo: login + todas as rotas de API GET + paginas."""
import json
import sys
import urllib.parse
import urllib.request
import http.cookiejar

base = 'http://localhost:3000'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

# Login
csrf = json.loads(opener.open(base + '/api/auth/csrf', timeout=60).read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf, 'email': 'admin@awc.com.br', 'password': 'admin123',
                               'callbackUrl': base + '/dashboard', 'json': 'true'}).encode()
req = urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
                             headers={'Content-Type': 'application/x-www-form-urlencoded'})
resp = opener.open(req, timeout=60)
session = json.loads(opener.open(base + '/api/auth/session', timeout=30).read().decode())
if not session.get('user'):
    print('LOGIN FAILED')
    sys.exit(1)
print('LOGIN OK:', session['user']['email'])

# Get an obra id for parameterized routes
obras = json.loads(opener.open(base + '/api/obras', timeout=60).read().decode())
obra_list = obras if isinstance(obras, list) else obras.get('obras', obras.get('rows', []))
obra_id = obra_list[0]['id'] if obra_list else None
print('OBRA ID:', obra_id)

apis = [
    '/api/obras', '/api/rdo', '/api/orcamentos', '/api/materiais', '/api/materiais/movimento',
    '/api/equipe', '/api/financeiro', '/api/contratos', '/api/galeria', '/api/ocorrencias',
    '/api/documentos', '/api/qualidade', '/api/seguranca', '/api/notificacoes',
    '/api/crud-options',
]
if obra_id:
    apis += [f'/api/andamento/{obra_id}', f'/api/cronograma/{obra_id}', f'/api/obras/{obra_id}']

crud_resources = ['obras', 'materiais', 'equipe', 'documentos', 'financeiro', 'ocorrencias',
                  'fornecedores', 'contratos', 'orcamentos']

pages = ['/dashboard', '/obras', '/rdo', '/cronograma', '/andamento', '/financeiro', '/materiais',
         '/equipe', '/documentos', '/qualidade', '/seguranca', '/galeria', '/relatorios',
         '/orcamentos', '/contratos', '/ocorrencias', '/notificacoes', '/orcador', '/rdo/novo', '/obras/novo']

fails = []

def check(url, label):
    try:
        r = opener.open(base + url, timeout=120)
        raw = r.read().decode(errors='replace')
        ok = r.status == 200
        if not ok or '"error"' in raw[:200]:
            fails.append((label, url, r.status, raw[:200]))
            print(f'FAIL {label} {url} -> {r.status} {raw[:150]}')
        else:
            print(f'OK   {label} {url} ({r.status}, {len(raw)}b)')
    except Exception as e:
        body = ''
        if hasattr(e, 'read'):
            try: body = e.read().decode(errors='replace')[:300]
            except Exception: pass
        fails.append((label, url, str(e), body))
        print(f'FAIL {label} {url} -> {e} {body[:200]}')

for a in apis:
    check(a, 'API ')
for r_ in crud_resources:
    check(f'/api/crud/{r_}', 'CRUD')
for p in pages:
    check(p, 'PAGE')

print()
print(f'TOTAL FAILURES: {len(fails)}')
for f in fails:
    print(' -', f[0], f[1], str(f[2])[:100])
sys.exit(1 if fails else 0)
