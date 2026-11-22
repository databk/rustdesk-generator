import type { ConfigCategory } from './types';

export const configCategories: ConfigCategory[] = [
  { key: 'connection', label: 'Connection & Access', description: 'Control how connections are established and what permissions are granted during remote sessions' },
  { key: 'security', label: 'Security & Auth', description: 'Configure authentication methods, passwords, and security policies' },
  { key: 'display', label: 'Display', description: 'Control visual display settings during remote sessions' },
  { key: 'av', label: 'Audio/Video & Codec', description: 'Configure audio, video quality, and codec preferences' },
  { key: 'file', label: 'File & Clipboard', description: 'Manage file transfer and clipboard sharing permissions' },
  { key: 'network', label: 'Network', description: 'Configure network protocols, servers, and proxy settings' },
  { key: 'general', label: 'General', description: 'General application behavior and UI preferences' },
  { key: 'floating', label: 'Floating Window', description: 'Configure the floating window appearance and behavior' },
  { key: 'privacy', label: 'Privacy & Recording', description: 'Control session recording and privacy mode settings' },
  { key: 'advanced', label: 'Advanced', description: 'Advanced settings for power users' },
  { key: 'preset', label: 'Preset & Address Book', description: 'Pre-configure address book entries and device presets' },
  { key: 'printer', label: 'Printer', description: 'Configure remote printer behavior' },
  { key: 'buildin', label: 'Built-in', description: 'Built-in customization options for branding and UI lockdown' },
];