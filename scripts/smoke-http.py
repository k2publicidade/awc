import json
import urllib.parse
import urllib.request
import http.cookiejar

base = 'http://localhost:3000'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf = json.loads(opener.open(base + '/api/auth/csrf', timeout=30).read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf,'email': 'admin@awc.com.br','password': 'admin123','callbackUrl': base + '/dashboard','json': 'true'}).encode()
req = urllib.request.Request(base + '/api/auth/callback/credentials', data=body, headers={'Content-Type':'application/x-www-form-urlencoded'})
resp = opener.open(req, timeout=30)
print('login', resp.status, resp.geturl())
for resource in ['obras','materiais','equipe','documentos','financeiro','ocorrencias']:
    resp = opener.open(base + f'/api/crud/{resource}', timeout=30)
    raw=resp.read().decode(errors='replace')
    print('raw', resource, resp.status, resp.geturl(), raw[:120].replace('\n',' '))
    data=json.loads(raw)
    print(resource, len(data.get('rows', [])))
