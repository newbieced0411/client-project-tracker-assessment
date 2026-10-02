import type { Project, ProjectInput } from "./types";

type Filters = { search: string; status: string; priority: string; sort: string };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: options?.body ? { "Content-Type": "application/json", ...options.headers } : options?.headers,
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload.details?.map((item: { message: string }) => item.message).join(" ");
    throw new Error(details || payload.error || "Request failed. Please try again.");
  }
  return payload.data;
}

export const api = {
  list(filters: Filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return request<Project[]>(`/api/projects?${params}`);
  },
  create(project: ProjectInput) {
    return request<Project>("/api/projects", { method: "POST", body: JSON.stringify(project) });
  },
  update(id: number, project: ProjectInput) {
    return request<Project>(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(project) });
  },
  delete(id: number) {
    return request<void>(`/api/projects/${id}`, { method: "DELETE" });
  },
};
