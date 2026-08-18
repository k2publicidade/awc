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

    all_tasks = []
    for t in project.getTasks():
        if t.getName() is None:
            continue
        
        name = str(t.getName()).strip()
        if not name:
            continue

        cost_val = 0.0
        try:
            if t.getCost():
                cost_val = float(t.getCost().doubleValue())
        except Exception:
            pass

        wbs_val = s(t.getWBS())
        level = t.getOutlineLevel().intValue() if t.getOutlineLevel() else 0
        is_summary = bool(t.getSummary())

        all_tasks.append({
            "id": t.getID().intValue() if t.getID() else None,
            "uid": t.getUniqueID().intValue() if t.getUniqueID() else None,
            "nivel": level,
            "wbs": wbs_val,
            "nome": name,
            "inicio": s(t.getStart()),
            "fim": s(t.getFinish()),
            "duracao": s(t.getDuration()),
            "custo": cost_val,
            "percentual": float(t.getPercentageComplete().doubleValue()) if t.getPercentageComplete() else 0.0,
            "resumo": is_summary,
            "marco": bool(t.getMilestone()),
            "predecessoras": [p.getPredecessorTask().getID().intValue() for p in (t.getPredecessors() or []) if p.getPredecessorTask() and p.getPredecessorTask().getID()],
            "notas": s(t.getNotes()) or None,
        })

    # Se o título do projeto não foi definido nas propriedades, tenta usar a tarefa raiz (nível 0)
    root_task = next((t for t in all_tasks if t["nivel"] == 0 or t["wbs"] == "0"), None)
    if not info["titulo"] and root_task:
        info["titulo"] = root_task["nome"]

    # Mapa de nomes de grupos pelo prefixo WBS para montar caminho da hierarquia
    summary_map = {t["wbs"]: t["nome"] for t in all_tasks if t["resumo"] and t["wbs"]}

    def get_parent_path(task):
        if not task["wbs"]:
            return None
        parts = task["wbs"].split(".")
        parents = []
        for i in range(1, len(parts)):
            prefix = ".".join(parts[:i])
            if prefix in summary_map:
                parents.append(summary_map[prefix])
        return " › ".join(parents) if parents else None

    # Filtrar apenas tarefas operacionais (folhas) que representam as etapas reais da obra
    leaf_tasks = [t for t in all_tasks if not t["resumo"] and t["nivel"] > 0]
    
    # Se não houver tarefas folha (caso raro de projeto plano), usa todas com nível > 0
    selected_tasks = leaf_tasks if len(leaf_tasks) > 0 else [t for t in all_tasks if t["nivel"] > 0 or t != root_task]

    for t in selected_tasks:
        t["caminho"] = get_parent_path(t)

    with open(out, "w", encoding="utf-8") as f:
        json.dump({"projeto": info, "tarefas": selected_tasks}, f, ensure_ascii=False, indent=1)

    print(f"OK {len(selected_tasks)} etapas de obra extraidas com sucesso")

if __name__ == '__main__':
    main()
