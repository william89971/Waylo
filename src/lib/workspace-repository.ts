import { constraintsFromProfile } from "@/lib/academic-twin";
import { WayloWorkspaceV1Schema, WayloWorkspaceV2Schema, WayloWorkspaceV3Schema, type WayloWorkspaceV2, type WayloWorkspaceV3 } from "@/lib/domain";

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
  load(): Promise<WayloWorkspaceV3 | undefined>;
  save(workspace: WayloWorkspaceV3): Promise<void>;
  reset(): Promise<void>;
}

function fromV2(workspace: WayloWorkspaceV2): WayloWorkspaceV3 {
  return WayloWorkspaceV3Schema.parse({
    ...workspace,
    version: 3,
    constraints: constraintsFromProfile(workspace.profile),
    selectedDestinationIds: ["berkeley", "ucla", "ucsd"],
    requirementStaleness: [],
  });
}

export function migrateWorkspace(input: unknown): WayloWorkspaceV3 | undefined {
  if (!input || typeof input !== "object") return undefined;
  const version = Reflect.get(input, "version");
  if (version === 3) {
    const parsed = WayloWorkspaceV3Schema.safeParse(input);
    return parsed.success ? parsed.data : undefined;
  }
  if (version === 2) {
    const parsed = WayloWorkspaceV2Schema.safeParse(input);
    return parsed.success ? fromV2(parsed.data) : undefined;
  }
  if (version !== 1) return undefined;
  const parsed = WayloWorkspaceV1Schema.safeParse(input);
  if (!parsed.success) return undefined;
  const v2 = WayloWorkspaceV2Schema.parse({
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
  return fromV2(v2);
}

export const workspaceRepository: WorkspaceRepository = {
  async load() {
    if (typeof indexedDB === "undefined") return undefined;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(KEY);
      request.onsuccess = () => resolve(migrateWorkspace(request.result));
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
