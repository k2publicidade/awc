import * as Network from "expo-network";
import {
  getRDOsOffline, markRDOSynced,
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
      try {
        await rdoApi.create(JSON.parse(rdo.jsonData));
        await markRDOSynced(rdo.id);
        synced++;
      } catch (e: any) {
        // Conflito (RDO do dia já existe) não deve travar a fila para sempre
        if (e?.response?.status === 400 || e?.response?.status === 409) {
          await markRDOSynced(rdo.id);
        }
        errors++;
      }
    }
  } catch { errors++; }

  // Fotos pendentes (data URL no campo url)
  try {
    const fotos = (await getFotosOffline()) as any[];
    for (const foto of fotos) {
      try {
        await galeriaApi.upload({
          obraId: foto.obraId,
          url: foto.dataUrl,
          legenda: foto.legenda || "",
          etapaId: foto.etapaId || null,
        });
        await markFotoUploaded(foto.id);
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
