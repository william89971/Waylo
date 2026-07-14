import { WayloWorkspaceV1Schema, WayloWorkspaceV2Schema, type WayloWorkspaceV2 } from "@/lib/domain";

const DB_NAME = "waylo-workspace";
const STORE_NAME = "workspace";
const KEY = "current";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface WorkspaceRepository {
  load(): Promise<WayloWorkspaceV2 | undefined>;
  save(workspace: WayloWorkspaceV2): Promise<void>;
  reset(): Promise<void>;
}

export function migrateWorkspace(input: unknown): WayloWorkspaceV2 | undefined {
  if (!input || typeof input !== "object") return undefined;
  const version = Reflect.get(input, "version");
  if (version === 2) {
    const parsed = WayloWorkspaceV2Schema.safeParse(input);
    return parsed.success ? parsed.data : undefined;
  }
  if (version !== 1) return undefined;
  const parsed = WayloWorkspaceV1Schema.safeParse(input);
  if (!parsed.success) return undefined;
  return WayloWorkspaceV2Schema.parse({
    ...parsed.data,
    version: 2,
    reviewResolutions: [],
    operationalTrace: parsed.data.planningEvents.map((event) => ({
      id: event.id,
      stage: event.type === "warning" ? "review" : event.type,
      label: event.label,
      detail: event.detail,
      status: event.status,
      evidenceIds: [],
    })),
  });
}

export const workspaceRepository: WorkspaceRepository = {
  async load() {
    if (typeof indexedDB === "undefined") return undefined;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(KEY);
      request.onsuccess = () => {
        resolve(migrateWorkspace(request.result));
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  },
  async save(workspace) {
    if (typeof indexedDB === "undefined") return;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(workspace, KEY);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    });
  },
  async reset() {
    if (typeof indexedDB === "undefined") return;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(KEY);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    });
  },
};
