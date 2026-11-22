
import { options as advancedOptions } from './options/advanced';
import { options as avOptions } from './options/av';
import { options as buildinOptions } from './options/buildin';
import { options as connectionOptions } from './options/connection';
import { options as displayOptions } from './options/display';
import { options as fileOptions } from './options/file';
import { options as floatingOptions } from './options/floating';
import { options as generalOptions } from './options/general';
import { options as networkOptions } from './options/network';
import { options as presetOptions } from './options/preset';
import { options as printerOptions } from './options/printer';
import { options as privacyOptions } from './options/privacy';
import { options as securityOptions } from './options/security';
import type { ConfigOption } from './types';

export { configCategories } from './categories';
export type { ConfigCategory, ConfigOption, ConfigOptionType, CustomConfig, TriggerRequest, TriggerResponse, BuildStatusResponse } from './types';

export const configOptions: ConfigOption[] = [
  ...connectionOptions,
  ...securityOptions,
  ...displayOptions,
  ...avOptions,
  ...fileOptions,
  ...networkOptions,
  ...generalOptions,
  ...floatingOptions,
  ...privacyOptions,
  ...advancedOptions,
  ...presetOptions,
  ...printerOptions,
  ...buildinOptions,
];

export const configOptionsMap = configOptions.reduce<Record<string, ConfigOption>>(
  (acc, opt) => {
    acc[opt.key] = opt;
    return acc;
  },
  {},
);

export function getOptionsByCategory(category: string): ConfigOption[] {
  return configOptions.filter((opt) => opt.category === category);
}

export function humanizeConfigOptionKey(optionKey: string): string {
  return optionKey
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getModifiedCount(
  configValues?: Record<string, string>,
): number {
  if (!configValues) return 0;
  return Object.keys(configValues).filter((key) => {
    const opt = configOptionsMap[key];
    if (!opt) return true;
    return configValues[key] !== opt.defaultValue;
  }).length;
}