import json
import urllib.parse
import urllib.request
import http.cookiejar

base = 'http://localhost:3000'
resources = ['obras','etapas','rdos','financeiro','materiais','equipe','documentos','qualidade','seguranca','galeria','orcamentos','contratos','ocorrencias','notificacoes']
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf = json.loads(opener.open(base + '/api/auth/csrf', timeout=30).read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf,'email': 'admin@awc.com.br','password': 'admin123','callbackUrl': base + '/dashboard','json': 'true'}).encode()
opener.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body, headers={'Content-Type':'application/x-www-form-urlencoded'}), timeout=30)
for r in resources:
    data = {}
    req = urllib.request.Request(base + f'/api/crud/{r}', data=json.dumps(data).encode(), headers={'Content-Type':'application/json'}, method='POST')
    try:
        resp = opener.open(req, timeout=30)
    except urllib.error.HTTPError as e:
        print(r, 'POST_ERROR', e.code, e.read().decode()[:500])
        raise
    created = json.loads(resp.read().decode())
    rid = created['id']
    req = urllib.request.Request(base + f'/api/crud/{r}/{rid}', data=json.dumps({}).encode(), headers={'Content-Type':'application/json'}, method='PATCH')
    resp = opener.open(req, timeout=30)
    updated = json.loads(resp.read().decode())
    req = urllib.request.Request(base + f'/api/crud/{r}/{rid}', method='DELETE')
    resp = opener.open(req, timeout=30)
    deleted = json.loads(resp.read().decode())
    print(r, 'create/update/delete OK', rid, deleted.get('ok'))
print('HTTP CRUD SMOKE OK')
