# -*- coding: utf-8 -*-
import json
import urllib.request
import urllib.parse
import http.cookiejar
from datetime import date, timedelta

base = 'http://localhost:3000'
jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf = json.loads(op.open(base + '/api/auth/csrf').read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf, 'email': 'admin@awc.com.br', 'password': 'admin123', 'json': 'true'}).encode()
op.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}))

r = op.open(base + '/cronograma', timeout=120)
print('page', r.status, len(r.read()))

obras = json.loads(op.open(base + '/api/crud/obras').read().decode())['rows']
oid = obras[0]['id']
payload = {'obraId': oid, 'nome': 'SMOKE Etapa', 'dataInicio': date.today().isoformat(),
           'dataFim': (date.today() + timedelta(days=30)).isoformat(), 'percentualPrevisto': 50, 'ordem': 99}
et = json.loads(op.open(urllib.request.Request(base + '/api/crud/etapas', data=json.dumps(payload).encode(),
                headers={'Content-Type': 'application/json'})).read().decode())
print('etapa criada', et['id'])

r2 = op.open(urllib.request.Request(base + '/api/cronograma/etapa/' + et['id'],
             data=json.dumps({'percentualRealizado': 33}).encode(),
             headers={'Content-Type': 'application/json'}, method='PUT'))
print('etapa atualizada %real =', json.loads(r2.read().decode())['percentualRealizado'])

r3 = op.open(urllib.request.Request(base + '/api/cronograma/' + oid, data=b'{}',
             headers={'Content-Type': 'application/json'}, method='POST'))
print('baseline v', json.loads(r3.read().decode())['versao'])

r4 = op.open(urllib.request.Request(base + '/api/cronograma/etapa/' + et['id'], method='DELETE'))
print('etapa excluida', r4.status)
