import type {
  BuildStatusResponse,
  TriggerRequest,
  TriggerResponse,
} from './config/types';

const API_URL = import.meta.env.PUBLIC_API_URL || '';

export async function triggerBuild(req: TriggerRequest): Promise<TriggerResponse> {
  const res = await fetch(`${API_URL}/api/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getBuildStatus(id: string): Promise<BuildStatusResponse> {
  const res = await fetch(`${API_URL}/api/build/${id}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export function getDownloadUrl(id: string, filename: string): string {
  return `${API_URL}/api/download/${id}/${filename}`;
}

export async function uploadLogo(file: File): Promise<{ filename: string }> {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await fetch(`${API_URL}/api/upload-logo`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}