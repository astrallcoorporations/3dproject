import type { Asset, ProjectRecord, Rig, Timeline } from "../types/project";

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Puppet could not complete that action.");
  return body as T;
}

function normalizeProject(project: ProjectRecord): ProjectRecord {
  return {
    ...project,
    rig: project.rig?.joints ? project.rig : { joints: {}, bones: [] },
    timeline: project.timeline?.keyframes ? project.timeline : { fps: 24, keyframes: [] },
    assets: project.assets ?? [],
  };
}

export const api = {
  createProject: async (name: string) =>
    normalizeProject(
      await request<ProjectRecord>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    ),
  updateProject: async (id: number, data: { rig?: Rig; timeline?: Timeline; activeAssetId?: number }) =>
    normalizeProject(
      await request<ProjectRecord>(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),
  uploadAsset: async (projectId: number, file: File) => {
    const data = new FormData();
    data.append("file", file);
    return request<Asset>(`/api/projects/${projectId}/assets`, { method: "POST", body: data });
  },
  refineAsset: (assetId: number, settings: { contrast: number; cleanup: boolean; paletteSize: number }) =>
    request<Asset>(`/api/assets/${assetId}/refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
  assetUrl: (asset: Asset | undefined) => (asset ? `${apiBase}${asset.url}` : ""),
};
