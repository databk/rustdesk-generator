const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface CustomConfig {
  app_name?: string;
  password?: string;
  salt?: string;
  conn_type?: string;
  disable_installation?: boolean;
  disable_settings?: boolean;
  disable_account?: boolean;
  disable_ab?: boolean;
  disable_tcp_listen?: boolean;
  override_settings?: string;
  default_settings?: string;
}

export interface TriggerRequest {
  os: string;
  arch?: string;
  custom: CustomConfig;
  turnstile_token?: string;
}

export interface TriggerResponse {
  uuid: string;
  status: string;
  message: string;
}

export interface BuildStatusResponse {
  uuid: string;
  status: string;
  os: string;
  arch: string;
  created_at: string;
  files: string[];
  message: string | null;
}

export async function triggerBuild(req: TriggerRequest): Promise<TriggerResponse> {
  const res = await fetch(`${API_URL}/api/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  formData.append("logo", file);
  const res = await fetch(`${API_URL}/api/upload-logo`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export const OS_OPTIONS = [
  { value: "all", label: "All Platforms" },
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "macos", label: "macOS" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
];

export const ARCH_OPTIONS: Record<string, { value: string; label: string }[]> = {
  all: [],
  windows: [
    { value: "x86_64", label: "x86_64 (64-bit)" },
    { value: "x86", label: "x86 (32-bit)" },
    { value: "aarch64", label: "ARM64" },
  ],
  linux: [
    { value: "x86_64", label: "x86_64" },
    { value: "aarch64", label: "ARM64" },
    { value: "armv7", label: "ARMv7" },
  ],
  macos: [
    { value: "x86_64", label: "Intel (x86_64)" },
    { value: "aarch64", label: "Apple Silicon (ARM64)" },
  ],
  android: [
    { value: "universal", label: "Universal (All architectures)" },
    { value: "aarch64", label: "ARM64" },
    { value: "armv7", label: "ARMv7" },
    { value: "x86_64", label: "x86_64" },
  ],
  ios: [
    { value: "aarch64", label: "ARM64" },
  ],
};

export const CONN_TYPE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "direct", label: "Direct" },
  { value: "relay", label: "Relay" },
];
