import * as SQLite from "expo-sqlite";

const DB_NAME = "rigor.db";

let db: SQLite.SQLiteDatabase | null = null;

export const getDB = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initTables();
  return db;
};

const initTables = async () => {
  if (!db) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rdo_offline (
      id TEXT PRIMARY KEY,
      remoteId TEXT,
      obraId TEXT NOT NULL,
      jsonData TEXT NOT NULL,
      sincronizado INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS fotos_offline (
      id TEXT PRIMARY KEY,
      rdoId TEXT,
      rdoLocalId TEXT,
      obraId TEXT NOT NULL,
      etapaId TEXT,
      dataUrl TEXT NOT NULL,
      legenda TEXT,
      uploaded INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ocorrencias_offline (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      obraId TEXT NOT NULL,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      sincronizado INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS requisicoes_offline (
      id TEXT PRIMARY KEY,
      obraId TEXT NOT NULL,
      materialId TEXT NOT NULL,
      quantidade REAL NOT NULL,
      justificativa TEXT,
      sincronizado INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migração aditiva para bancos criados por versões anteriores do aplicativo.
  const rdoColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(rdo_offline)");
  if (!rdoColumns.some((column) => column.name === "remoteId")) {
    await db.execAsync("ALTER TABLE rdo_offline ADD COLUMN remoteId TEXT");
  }
  const fotoColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(fotos_offline)");
  if (!fotoColumns.some((column) => column.name === "rdoLocalId")) {
    await db.execAsync("ALTER TABLE fotos_offline ADD COLUMN rdoLocalId TEXT");
  }
};

// ---------- RDO ----------
/** Salva o payload completo do RDO (mesmo formato do POST /api/rdo). */
export const saveRDOOffline = async (id: string, obraId: string, payload: any) => {
  const database = await getDB();
  await database.runAsync(
    "INSERT OR REPLACE INTO rdo_offline (id, obraId, jsonData, sincronizado) VALUES (?, ?, ?, 0)",
    [id, obraId, JSON.stringify(payload)]
  );
};

export const getRDOsOffline = async () => {
  const database = await getDB();
  return database.getAllAsync("SELECT * FROM rdo_offline WHERE sincronizado = 0 ORDER BY createdAt ASC");
};

export const markRDOSynced = async (id: string, remoteId: string) => {
  const database = await getDB();
  await database.runAsync("UPDATE rdo_offline SET sincronizado = 1, remoteId = ? WHERE id = ?", [remoteId, id]);
};

export const getRemoteRDOId = async (localId: string): Promise<string | null> => {
  const database = await getDB();
  const row = await database.getFirstAsync<{ remoteId: string | null }>(
    "SELECT remoteId FROM rdo_offline WHERE id = ?",
    [localId]
  );
  return row?.remoteId || null;
};

export const countPendentes = async (): Promise<number> => {
  const database = await getDB();
  const rows = await database.getAllAsync<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM rdo_offline WHERE sincronizado = 0)
          + (SELECT COUNT(*) FROM fotos_offline WHERE uploaded = 0)
          + (SELECT COUNT(*) FROM ocorrencias_offline WHERE sincronizado = 0)
          + (SELECT COUNT(*) FROM requisicoes_offline WHERE sincronizado = 0) AS n`
  );
  return rows[0]?.n ?? 0;
};

// ---------- Fotos ----------
/** dataUrl mantém o nome histórico, mas armazena URI local do JPEG com marca d'água. */
export const saveFotoOffline = async (
  id: string,
  obraId: string,
  dataUrl: string,
  legenda: string,
  etapaId?: string | null,
  rdoId?: string | null,
  rdoLocalId?: string | null
) => {
  const database = await getDB();
  await database.runAsync(
    "INSERT OR REPLACE INTO fotos_offline (id, obraId, dataUrl, legenda, etapaId, rdoId, rdoLocalId, uploaded) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
    [id, obraId, dataUrl, legenda, etapaId || null, rdoId || null, rdoLocalId || null]
  );
};

export const getFotosOffline = async () => {
  const database = await getDB();
  return database.getAllAsync("SELECT * FROM fotos_offline WHERE uploaded = 0 ORDER BY createdAt ASC");
};

export const markFotoUploaded = async (id: string) => {
  const database = await getDB();
  await database.runAsync("UPDATE fotos_offline SET uploaded = 1 WHERE id = ?", [id]);
};

// ---------- Ocorrências ----------
export const saveOcorrenciaOffline = async (id: string, data: string, obraId: string, tipo: string, descricao: string) => {
  const database = await getDB();
  await database.runAsync(
    "INSERT OR REPLACE INTO ocorrencias_offline (id, data, obraId, tipo, descricao, sincronizado) VALUES (?, ?, ?, ?, ?, 0)",
    [id, data, obraId, tipo, descricao]
  );
};

export const getOcorrenciasOffline = async () => {
  const database = await getDB();
  return database.getAllAsync("SELECT * FROM ocorrencias_offline WHERE sincronizado = 0 ORDER BY createdAt ASC");
};

export const markOcorrenciaSynced = async (id: string) => {
  const database = await getDB();
  await database.runAsync("UPDATE ocorrencias_offline SET sincronizado = 1 WHERE id = ?", [id]);
};

// ---------- Requisições ----------
export const saveRequisicaoOffline = async (id: string, obraId: string, materialId: string, quantidade: number, justificativa?: string) => {
  const database = await getDB();
  await database.runAsync(
    "INSERT OR REPLACE INTO requisicoes_offline (id, obraId, materialId, quantidade, justificativa, sincronizado) VALUES (?, ?, ?, ?, ?, 0)",
    [id, obraId, materialId, quantidade, justificativa || null]
  );
};

export const getRequisicoesOffline = async () => {
  const database = await getDB();
  return database.getAllAsync("SELECT * FROM requisicoes_offline WHERE sincronizado = 0 ORDER BY createdAt ASC");
};

export const markRequisicaoSynced = async (id: string) => {
  const database = await getDB();
  await database.runAsync("UPDATE requisicoes_offline SET sincronizado = 1 WHERE id = ?", [id]);
};
