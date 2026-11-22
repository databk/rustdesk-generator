export type ConfigOptionType = 'switch' | 'select' | 'number' | 'text';

export type ConfigOption = {
  key: string;
  label: string;
  category: string;
  type: ConfigOptionType;
  defaultValue: string;
  options?: string[];
  min?: number;
  max?: number;
  description?: string;
  strategySupported?: boolean;
};

export type ConfigCategory = {
  key: string;
  label: string;
  description?: string;
};

export type CustomConfig = {
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
  [key: string]: string | boolean | undefined;
};

export type TriggerRequest = {
  os: string;
  arch?: string;
  custom: CustomConfig;
  turnstile_token?: string;
};

export type TriggerResponse = {
  uuid: string;
  status: string;
  message: string;
};

export type BuildStatusResponse = {
  uuid: string;
  status: string;
  os: string;
  arch: string;
  created_at: string;
  files: string[];
  message: string | null;
};
