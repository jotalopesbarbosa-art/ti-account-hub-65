// src/lib/nocodbClient.ts
import { nocodbEnv } from "./nocodb.config";

type SortDirection = "asc" | "desc";
export type NocoSort = { field: string; direction: SortDirection };

export type ListParams = {
  fields?: string[];
  sort?: NocoSort[];
  where?: string;
  page?: number;
  pageSize?: number;
  nestedPage?: number;
  viewId?: string;
};

export type NocoRecord<TFields = any> = {
  id: string;
  fields: TFields;
};

export type NocoListResponse<TFields = any> = {
  records: Array<NocoRecord<TFields>>;
  next?: string;
  prev?: string;
  nestedNext?: string;
  nestedPrev?: string;
};

export type NocoCountResponse = { count: number };

class NocoDbError extends Error {
  status?: number;
  details?: any;
  constructor(message: string, status?: number, details?: any) {
    super(message);
    this.name = "NocoDbError";
    this.status = status;
    this.details = details;
  }
}

function buildQuery(params?: ListParams) {
  const q = new URLSearchParams();
  if (!params) return q;

  if (params.fields?.length) for (const f of params.fields) q.append("fields", f);
  if (params.sort?.length) for (const s of params.sort) q.append("sort", JSON.stringify(s));

  if (params.where) q.set("where", params.where);
  if (params.page != null) q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params.nestedPage != null) q.set("nestedPage", String(params.nestedPage));
  if (params.viewId) q.set("viewId", params.viewId);

  return q;
}

/** ✅ detecta "já existe" (422) tanto em msg quanto em details */
function isAlreadyExistsError(err: any) {
  const status = err?.status;
  const msg = String(err?.message || "").toLowerCase();
  const dmsg = String(err?.details?.msg || err?.details?.message || "").toLowerCase();
  const raw = String(err?.details || "").toLowerCase();

  const hay = `${msg} ${dmsg} ${raw}`;
  return status === 422 && (hay.includes("already exists") || hay.includes("record already exists"));
}

/** ✅ opcional: unlink idempotente quando não existe */
function isNotLinkedError(err: any) {
  const status = err?.status;
  const msg = String(err?.message || "").toLowerCase();
  const dmsg = String(err?.details?.msg || err?.details?.message || "").toLowerCase();
  const raw = String(err?.details || "").toLowerCase();

  const hay = `${msg} ${dmsg} ${raw}`;
  // depende da instalação/versão: algumas retornam 404/422 com "not found"
  return (status === 404 || status === 422) && (hay.includes("not found") || hay.includes("does not exist"));
}

async function nocodbFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${nocodbEnv.baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "xc-token": nocodbEnv.apiToken,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // mantém texto cru
  }

  if (!res.ok) {
    const msg = (json && (json.msg || json.message)) || `Erro NocoDB (${res.status}) em ${path}`;
    throw new NocoDbError(msg, res.status, json ?? text);
  }

  return (json ?? (text as any)) as T;
}

/**
 * Links v3:
 * - single: { "id": "22" }
 * - bulk:   [{ "id": "22" }, { "id": "23" }]
 */
type LinkId = string | number | { id: string | number };

function normalizeLinkIds(ids: LinkId[]) {
  const arr = ids.map((x) => {
    const id = typeof x === "object" && x !== null ? (x as any).id : x;
    if (id == null || id === "") throw new Error("[NocoDB] link id inválido");
    return { id: String(id) };
  });

  return arr;
}

function linkPayload(ids: LinkId[]) {
  const arr = normalizeLinkIds(ids);
  return arr.length === 1 ? arr[0] : arr;
}

export class NocoDBClient {
  public projectId = nocodbEnv.projectId;

  // -------------------------
  // Records
  // -------------------------
  listRecords<TFields = any>(tableId: string, params?: ListParams) {
    const q = buildQuery(params);
    const qs = q.toString();
    return nocodbFetch<NocoListResponse<TFields>>(
      `/api/v3/data/${this.projectId}/${tableId}/records${qs ? `?${qs}` : ""}`,
      { method: "GET" }
    );
  }

  getRecord<TFields = any>(tableId: string, recordId: string, fields?: string[]) {
    const q = new URLSearchParams();
    if (fields?.length) for (const f of fields) q.append("fields", f);
    const qs = q.toString();

    return nocodbFetch<NocoRecord<TFields>>(
      `/api/v3/data/${this.projectId}/${tableId}/records/${encodeURIComponent(recordId)}${qs ? `?${qs}` : ""}`,
      { method: "GET" }
    );
  }

  countRecords(tableId: string, where?: string, viewId?: string) {
    const q = new URLSearchParams();
    if (where) q.set("where", where);
    if (viewId) q.set("viewId", viewId);
    const qs = q.toString();

    return nocodbFetch<NocoCountResponse>(
      `/api/v3/data/${this.projectId}/${tableId}/count${qs ? `?${qs}` : ""}`,
      { method: "GET" }
    );
  }

  createRecords<TFields = any>(tableId: string, fieldsArray: TFields[]) {
    const body =
      fieldsArray.length === 1
        ? { fields: fieldsArray[0] }
        : { records: fieldsArray.map((fields) => ({ fields })) };

    return nocodbFetch<NocoListResponse<TFields>>(`/api/v3/data/${this.projectId}/${tableId}/records`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  updateRecords<TFields = any>(tableId: string, updates: Array<{ id: string; fields: Partial<TFields> }>) {
    const body =
      updates.length === 1
        ? { id: updates[0].id, fields: updates[0].fields }
        : { records: updates.map((u) => ({ id: u.id, fields: u.fields })) };

    return nocodbFetch<NocoListResponse<TFields>>(`/api/v3/data/${this.projectId}/${tableId}/records`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  deleteRecord(tableId: string, recordId: string) {
    return nocodbFetch<any>(`/api/v3/data/${this.projectId}/${tableId}/records`, {
      method: "DELETE",
      body: JSON.stringify({ id: recordId }),
    });
  }

  // -------------------------
  // Links
  // -------------------------
  listLinks<TFields = any>(tableId: string, linkFieldId: string, recordId: string, params?: ListParams) {
    const q = buildQuery(params);
    const qs = q.toString();

    return nocodbFetch<NocoListResponse<TFields>>(
      `/api/v3/data/${this.projectId}/${tableId}/links/${linkFieldId}/${encodeURIComponent(recordId)}${qs ? `?${qs}` : ""}`,
      { method: "GET" }
    );
  }

  // compat
  request<T = any>(path: string, init?: RequestInit) {
    return nocodbFetch<T>(path, init);
  }

  listLinkRecords<TFields = any>(tableId: string, linkFieldId: string, recordId: string, params?: ListParams) {
    return this.listLinks<TFields>(tableId, linkFieldId, recordId, params);
  }

  /** ✅ idempotente: se já existir, ignora */
  async linkRecords(tableId: string, linkFieldId: string, recordId: string, idsToLink: LinkId[]) {
    try {
      return await nocodbFetch<any>(
        `/api/v3/data/${this.projectId}/${tableId}/links/${linkFieldId}/${encodeURIComponent(recordId)}`,
        {
          method: "POST",
          body: JSON.stringify(linkPayload(idsToLink)),
        }
      );
    } catch (e: any) {
      if (isAlreadyExistsError(e)) return { success: true, ignored: true };
      throw e;
    }
  }

  /** ✅ idempotente opcional: se não existir, ignora */
  async unlinkRecords(tableId: string, linkFieldId: string, recordId: string, idsToUnlink: LinkId[]) {
    try {
      return await nocodbFetch<any>(
        `/api/v3/data/${this.projectId}/${tableId}/links/${linkFieldId}/${encodeURIComponent(recordId)}`,
        {
          method: "DELETE",
          body: JSON.stringify(linkPayload(idsToUnlink)),
        }
      );
    } catch (e: any) {
      if (isNotLinkedError(e)) return { success: true, ignored: true };
      throw e;
    }
  }
}

export const nocodb = new NocoDBClient();
