export const OS_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'macos', label: 'macOS' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
];

export const ARCH_OPTIONS: Record<string, { value: string; label: string }[]> = {
  all: [],
  windows: [
    { value: 'x86_64', label: 'x86_64 (64-bit)' },
    { value: 'x86', label: 'x86 (32-bit)' },
    { value: 'aarch64', label: 'ARM64' },
  ],
  linux: [
    { value: 'x86_64', label: 'x86_64' },
    { value: 'aarch64', label: 'ARM64' },
    { value: 'armv7', label: 'ARMv7' },
  ],
  macos: [
    { value: 'x86_64', label: 'Intel (x86_64)' },
    { value: 'aarch64', label: 'Apple Silicon (ARM64)' },
  ],
  android: [
    { value: 'universal', label: 'Universal (All architectures)' },
    { value: 'aarch64', label: 'ARM64' },
    { value: 'armv7', label: 'ARMv7' },
    { value: 'x86_64', label: 'x86_64' },
  ],
  ios: [
    { value: 'aarch64', label: 'ARM64' },
  ],
};

export const CONN_TYPE_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'direct', label: 'Direct' },
  { value: 'relay', label: 'Relay' },
];

export const FEATURE_TOGGLES = [
  { key: 'disable_installation', label: 'Disable Installation' },
  { key: 'disable_settings', label: 'Disable Settings' },
  { key: 'disable_account', label: 'Disable Account' },
  { key: 'disable_ab', label: 'Disable Address Book' },
  { key: 'disable_tcp_listen', label: 'Disable TCP Listen' },
];