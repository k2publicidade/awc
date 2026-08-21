import * as Network from "expo-network";
import * as FileSystem from "expo-file-system/legacy";
import {
  getRDOsOffline, markRDOSynced, getRemoteRDOId,
  getFotosOffline, markFotoUploaded,
  getOcorrenciasOffline, markOcorrenciaSynced,
  getRequisicoesOffline, markRequisicaoSynced,
  countPendentes,
} from "./database";
import { rdoApi, galeriaApi, ocorrenciasApi, materiaisApi } from "./api";

export const checkConnectivity = async (): Promise<boolean> => {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return false;
  }
};

export const getPendingCount = countPendentes;

const dateOnly = (value: unknown) => String(value || "").slice(0, 10);

/** Recupera o ID remoto quando um retry encontra o RDO do mesmo dia já criado. */
const findExistingRemoteRDO = async (obraId: string, payload: any): Promise<string | null> => {
  const response = await rdoApi.list(obraId);
  const rows = Array.isArray(response.data) ? response.data : [];
  const existing = rows.find((item: any) => dateOnly(item.data) === dateOnly(payload.data));
  return typeof existing?.id === "string" ? existing.id : null;
};

/** Envia tudo que está na fila offline. Retorna contagens para o banner de sync. */
export const syncAll = async () => {
  const isConnected = await checkConnectivity();
  if (!isConnected) return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  // RDOs pendentes (payload completo já no formato do POST /api/rdo)
  try {
    const pendentes = (await getRDOsOffline()) as any[];
    for (const rdo of pendentes) {
      const payload = JSON.parse(rdo.jsonData);
      try {
        const response = await rdoApi.create(payload);
        const remoteId = response.data?.id;
        if (typeof remoteId !== "string" || !remoteId) throw new Error("RDO criado sem ID remoto");
        await markRDOSynced(rdo.id, remoteId);
        synced++;
      } catch (e: any) {
        // Um retry pode encontrar o registro já criado; confirme o ID antes de
        // liberar as fotos dependentes. Erros de validação permanecem na fila.
        if (e?.response?.status === 400 || e?.response?.status === 409) {
          try {
            const remoteId = await findExistingRemoteRDO(rdo.obraId, payload);
            if (remoteId) {
              await markRDOSynced(rdo.id, remoteId);
              synced++;
              continue;
            }
          } catch { /* mantém pendente para nova tentativa */ }
        }
        errors++;
      }
    }
  } catch { errors++; }

  // Fotos pendentes: primeiro arquivo em /uploads, depois metadados em /galeria.
  try {
    const fotos = (await getFotosOffline()) as any[];
    for (const foto of fotos) {
      try {
        const remoteRdoId = foto.rdoId || (foto.rdoLocalId ? await getRemoteRDOId(foto.rdoLocalId) : null);
        if (foto.rdoLocalId && !remoteRdoId) {
          throw new Error("RDO remoto ainda não resolvido para esta foto");
        }
        await galeriaApi.uploadPhoto(foto.dataUrl, {
          obraId: foto.obraId,
          legenda: foto.legenda || "",
          etapaId: foto.etapaId || null,
          rdoId: remoteRdoId,
        });
        await markFotoUploaded(foto.id);
        if (FileSystem.documentDirectory && foto.dataUrl?.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.deleteAsync(foto.dataUrl, { idempotent: true }).catch(() => {});
        }
        synced++;
      } catch { errors++; }
    }
  } catch { errors++; }

  // Ocorrências pendentes
  try {
    const ocs = (await getOcorrenciasOffline()) as any[];
    for (const oc of ocs) {
      try {
        await ocorrenciasApi.create({ data: oc.data, obraId: oc.obraId, tipo: oc.tipo, descricao: oc.descricao });
        await markOcorrenciaSynced(oc.id);
        synced++;
      } catch { errors++; }
    }
  } catch { errors++; }

  // Requisições de material pendentes
  try {
    const reqs = (await getRequisicoesOffline()) as any[];
    for (const req of reqs) {
      try {
        await materiaisApi.requisitar({
          obraId: req.obraId, materialId: req.materialId,
          quantidade: req.quantidade, justificativa: req.justificativa || undefined,
        });
        await markRequisicaoSynced(req.id);
        synced++;
      } catch { errors++; }
    }
  } catch { errors++; }

  return { synced, errors };
};
