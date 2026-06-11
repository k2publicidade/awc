# -*- coding: utf-8 -*-
# Extrai tarefas de um arquivo .mpp (MS Project) para JSON usando mpxj.
import json
import os
import sys

os.environ.setdefault("JAVA_HOME", r"C:\Program Files\Eclipse Adoptium\jre-21.0.11.10-hotspot")

import jpype
import mpxj  # noqa: F401  (configura o classpath do jpype)

jpype.startJVM()
from org.mpxj.reader import UniversalProjectReader  # noqa: E402

src = sys.argv[1]
out = sys.argv[2]

project = UniversalProjectReader().read(src)

def s(v):
    return str(v) if v is not None else None

props = project.getProjectProperties()
info = {
    "titulo": s(props.getProjectTitle()),
    "autor": s(props.getAuthor()),
    "dataInicio": s(props.getStartDate()),
    "dataFim": s(props.getFinishDate()),
    "dataStatus": s(props.getStatusDate()),
}

tasks = []
for t in project.getTasks():
    if t.getName() is None:
        continue
    tasks.append({
        "id": t.getID().intValue() if t.getID() else None,
        "uid": t.getUniqueID().intValue() if t.getUniqueID() else None,
        "nivel": t.getOutlineLevel().intValue() if t.getOutlineLevel() else 0,
        "wbs": s(t.getWBS()),
        "nome": s(t.getName()),
        "inicio": s(t.getStart()),
        "fim": s(t.getFinish()),
        "duracao": s(t.getDuration()),
        "percentual": float(t.getPercentageComplete().doubleValue()) if t.getPercentageComplete() else 0.0,
        "resumo": bool(t.getSummary()),
        "marco": bool(t.getMilestone()),
        "predecessoras": [p.getPredecessorTask().getID().intValue() for p in (t.getPredecessors() or [])],
        "notas": s(t.getNotes()) or None,
    })

with open(out, "w", encoding="utf-8") as f:
    json.dump({"projeto": info, "tarefas": tasks}, f, ensure_ascii=False, indent=1)

print(f"OK {len(tasks)} tarefas extraidas")
print(json.dumps(info, ensure_ascii=False))
