# -*- coding: utf-8 -*-
"""Ciclo CRUD completo (POST -> PATCH -> DELETE) em todos os recursos."""
import json
import sys
import urllib.parse
import urllib.request
import http.cookiejar

base = 'http://localhost:3000'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

csrf = json.loads(opener.open(base + '/api/auth/csrf', timeout=60).read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf, 'email': 'admin@awc.com.br', 'password': 'admin123',
                               'callbackUrl': base + '/dashboard', 'json': 'true'}).encode()
opener.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}), timeout=60)
print('LOGIN OK')

resources = ['obras', 'etapas', 'rdos', 'financeiro', 'medicoes', 'materiais', 'estoqueMovimentos',
             'requisicoes', 'fornecedores', 'equipe', 'equipes', 'equipeMembros', 'presencas',
             'epis', 'treinamentos', 'documentos', 'qualidade', 'inspecoes', 'seguranca',
             'acidentes', 'galeria', 'orcamentos', 'contratos', 'ocorrencias', 'notificacoes']

fails = []

def req(method, url, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(base + url, data=data, method=method,
                               headers={'Content-Type': 'application/json'})
    resp = opener.open(r, timeout=120)
    raw = resp.read().decode(errors='replace')
    return resp.status, json.loads(raw) if raw else {}

for res in resources:
    rid = None
    try:
        st, created = req('POST', f'/api/crud/{res}', {})
        rid = created.get('id')
        if not rid:
            raise Exception(f'sem id: {str(created)[:150]}')
        st2, patched = req('PATCH', f'/api/crud/{res}/{rid}', {})
        st3, deleted = req('DELETE', f'/api/crud/{res}/{rid}')
        print(f'OK   {res}: create={st} patch={st2} delete={st3}')
    except Exception as e:
        b = ''
        if hasattr(e, 'read'):
            try: b = e.read().decode(errors='replace')[:250]
            except Exception: pass
        fails.append((res, str(e), b))
        print(f'FAIL {res} -> {e} {b}')
        # tenta limpar mesmo em caso de falha de patch
        if rid:
            try: req('DELETE', f'/api/crud/{res}/{rid}')
            except Exception: pass

print()
print(f'TOTAL FAILURES: {len(fails)}')
for f in fails:
    print(' -', f[0], f[1][:100], f[2][:200])
sys.exit(1 if fails else 0)
