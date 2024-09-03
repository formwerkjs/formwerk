import { isObject } from '../../../shared/src';
import { isNullOrUndefined } from './common';

export function appendToFormData(jsonObject: Record<string, any>, formData: FormData, parentKey = ''): FormData {
  for (const key in jsonObject) {
    if (!Object.prototype.hasOwnProperty.call(jsonObject, key)) {
      continue;
    }

    const value = jsonObject[key];
    const newKey = parentKey ? `${parentKey}[${key}]` : key;

    if (value instanceof File) {
      formData.append(newKey, value, value.name);
      continue;
    }

    if (isNullOrUndefined(value)) {
      // Treat nulls as empty strings
      // There might be people who prefer to omit the key entirely, but this is a safer approach
      // Since BE frameworks do convert empty strings to nulls
      formData.append(newKey, '');
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        appendToFormData({ [`${newKey}[${index}]`]: item }, formData);
      });
      continue;
    }

    if (isObject(value) && !(value instanceof File)) {
      appendToFormData(value, formData, newKey);
      continue;
    }

    formData.append(newKey, value);
  }

  return formData;
}
