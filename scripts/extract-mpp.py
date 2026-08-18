# -*- coding: utf-8 -*-
import json
import os
import sys

# Auto-detect or set JAVA_HOME if not defined
if not os.environ.get("JAVA_HOME"):
    candidate_paths = [
        r"C:\Program Files\Eclipse Adoptium\jre-21.0.11.10-hotspot",
        r"C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot",
        r"C:\Program Files\Java\jdk-21",
        r"C:\Program Files\Java\jre-21",
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            os.environ["JAVA_HOME"] = p
            break

import jpype
import mpxj

if not jpype.isJVMStarted():
    jpype.startJVM()

from org.mpxj.reader import UniversalProjectReader

def s(v):
    return str(v) if v is not None else None

def main():
    if len(sys.argv) < 3:
        print("Uso: python extract-mpp.py <arquivo.mpp> <saida.json>")
        sys.exit(1)

    src = sys.argv[1]
    out = sys.argv[2]

    try:
        project = UniversalProjectReader().read(src)
    except Exception as err:
        print(f"ERRO_LEITURA: {err}", file=sys.stderr)
        sys.exit(1)

    props = project.getProjectProperties()
    info = {
        "titulo": s(props.getProjectTitle()) if props else None,
        "autor": s(props.getAuthor()) if props else None,
        "empresa": s(props.getCompany()) if props else None,
        "assunto": s(props.getSubject()) if props else None,
        "dataInicio": s(props.getStartDate()) if props else None,
        "dataFim": s(props.getFinishDate()) if props else None,
        "dataStatus": s(props.getStatusDate()) if props else None,
        "custoTotal": float(props.getCost().doubleValue()) if props and props.getCost() else 0.0,
    }

    tasks = []
    for t in project.getTasks():
        if t.getName() is None:
            continue
        
        cost_val = 0.0
        try:
            if t.getCost():
                cost_val = float(t.getCost().doubleValue())
        except Exception:
            pass

        tasks.append({
            "id": t.getID().intValue() if t.getID() else None,
            "uid": t.getUniqueID().intValue() if t.getUniqueID() else None,
            "nivel": t.getOutlineLevel().intValue() if t.getOutlineLevel() else 0,
            "wbs": s(t.getWBS()),
            "nome": s(t.getName()),
            "inicio": s(t.getStart()),
            "fim": s(t.getFinish()),
            "duracao": s(t.getDuration()),
            "custo": cost_val,
            "percentual": float(t.getPercentageComplete().doubleValue()) if t.getPercentageComplete() else 0.0,
            "resumo": bool(t.getSummary()),
            "marco": bool(t.getMilestone()),
            "predecessoras": [p.getPredecessorTask().getID().intValue() for p in (t.getPredecessors() or []) if p.getPredecessorTask()],
            "notas": s(t.getNotes()) or None,
        })

    with open(out, "w", encoding="utf-8") as f:
        json.dump({"projeto": info, "tarefas": tasks}, f, ensure_ascii=False, indent=1)

    print(f"OK {len(tasks)} tarefas extraidas")

if __name__ == '__main__':
    main()
