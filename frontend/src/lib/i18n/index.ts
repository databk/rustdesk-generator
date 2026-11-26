import type { Locale } from './translations';
import { translations as uiTranslations } from './translations';
import { optionTranslations } from './option-translations';

export type { Locale };

const STORAGE_KEY = 'locale';

export function getStoredLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLocale(stored)) {
      return stored as Locale;
    }
  }
  return 'en-US';
}

export function setStoredLocale(locale: Locale): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale);
  }
}

function isValidLocale(value: string): boolean {
  return ['en-US', 'zh-CN', 'es-ES', 'fr-FR', 'pt-BR', 'ru-RU'].includes(value);
}

export function applyTranslations(locale: Locale): void {
  const ui = uiTranslations[locale] || uiTranslations['en-US'];
  const opts = optionTranslations[locale] || optionTranslations['en-US'];

  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    const key = el.getAttribute('data-i18n');
    if (key && ui[key]) {
      el.textContent = ui[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && ui[key]) {
      (el as HTMLElement).setAttribute('placeholder', ui[key]);
    }
  });

  document.querySelectorAll('[data-option-label]').forEach(function(el) {
    const key = el.getAttribute('data-option-label');
    if (key && opts[key]) {
      el.textContent = opts[key].label;
    }
  });

  document.querySelectorAll('[data-option-description]').forEach(function(el) {
    const key = el.getAttribute('data-option-description');
    if (key && opts[key] && opts[key].description) {
      el.textContent = opts[key].description!;
    }
  });

  document.querySelectorAll('select[data-config-type="select"]').forEach(function(select) {
    const optionKey = select.getAttribute('data-config-key');
    if (optionKey && opts[optionKey] && opts[optionKey].values) {
      const valueMap = opts[optionKey].values!;
      select.querySelectorAll('option').forEach(function(opt) {
        const val = opt.getAttribute('value');
        if (val && valueMap[val]) {
          opt.textContent = valueMap[val];
        }
      });
    }
  });

  document.documentElement.setAttribute('lang', locale);
}

export function initI18n(): Locale {
  const locale = getStoredLocale();
  applyTranslations(locale);
  return locale;
}