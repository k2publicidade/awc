# -*- coding: utf-8 -*-
import json
import urllib.request
import urllib.parse
import http.cookiejar

base = 'http://localhost:3000'
jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf = json.loads(op.open(base + '/api/auth/csrf').read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf, 'email': 'admin@awc.com.br', 'password': 'admin123', 'json': 'true'}).encode()
op.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}))

obras = json.loads(op.open(base + '/api/crud/obras').read().decode())['rows']
oid = obras[0]['id']

for url, markers in [
    ('/relatorios', ['Gerar relat', 'Curva S', 'Databook']),
    ('/obras/' + oid, ['Avan', 'Cronograma', 'Atalhos']),
    ('/cronograma', ['Salvar baseline', 'Nova etapa']),
    ('/dashboard', ['Obras ativas', 'Hoje na opera']),
]:
    r = op.open(base + url, timeout=120)
    raw = r.read().decode(errors='replace')
    miss = [m for m in markers if m not in raw]
    print(('OK  ' if r.status == 200 and not miss else 'FAIL'), url, r.status, 'missing:', miss)
