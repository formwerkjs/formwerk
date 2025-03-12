import { computed, markRaw, provide, readonly, ref, toValue } from 'vue';
import { Arrayable, Reactivify, StandardSchema } from '../types';
import {
  createDescribedByProps,
  isButtonElement,
  isInputElement,
  isNullOrUndefined,
  normalizeArrayable,
  normalizeProps,
  propsToValues,
  removeFirst,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { useErrorMessage, useLabel } from '../a11y';
import { exposeField, useFormField } from '../useFormField';
import { useInputValidity } from '../validation';
import { blockEvent } from '../utils/events';
import { registerField } from '@formwerk/devtools';
import { FileEntryProps } from './useFileEntry';
import { FileEntryCollectionKey } from './types';

export interface FileUploadContext {
  /**
   * The file that was just picked.
   */
  file: File;

  /**
   * The key of the entry containing the file.
   */
  key: string;

  /**
   * A signal that can be used to abort the upload.
   */
  signal: AbortSignal;
}

export interface FileFieldProps {
  /**
   * The label of the field.
   */
  label: string;

  /**
   * The name of the field.
   */
  name?: string;

  /**
   * The file types that are accepted (e.g. "image/*", "application/pdf").
   */
  accept?: string;

  /**
   * Whether the field allows multiple files to be selected.
   */
  multiple?: boolean;

  /**
   * Whether the field is required.
   */
  required?: boolean;

  /**
   * The description text of the field. Usually contains directions for the user.
   */
  description?: string;

  /**
   * Whether the field is disabled.
   */
  disabled?: boolean;

  /**
   * Handles the file upload, this function is called when the user selects a file, and is called for new picked files.
   */
  onUpload?: (context: FileUploadContext) => Promise<string | undefined>;

  /**
   * The schema for the field.
   */
  schema?: StandardSchema<Arrayable<File>>;
}

export function useFileField(_props: Reactivify<FileFieldProps, 'schema' | 'onUpload'>) {
  let idCounter = 0;
  const props = normalizeProps(_props, ['schema', 'onUpload']);
  const inputEl = ref<HTMLInputElement>();
  const entries = ref<FileEntryProps[]>([]);
  const inputId = useUniqId(FieldTypePrefixes.FileField);
  const triggerEl = ref<HTMLElement>();
  const abortControllers = new Map<string, AbortController>();

  const field = useFormField<Arrayable<File | string>>({
    path: props.name,
    disabled: props.disabled,
    schema: props.schema,
  });

  const { validityDetails } = useInputValidity({ inputEl, field });

  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputEl,
  });

  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId,
    errorMessage: field.errorMessage,
  });

  function isMultiple() {
    return toValue(props.multiple) ?? false;
  }

  function setValue(value: File | string, idx?: number) {
    if (!isMultiple()) {
      field.setValue(value);
      return;
    }

    if (isNullOrUndefined(idx) || idx === -1) {
      return;
    }

    const nextValue = normalizeArrayable(field.fieldValue.value ?? []);
    nextValue[idx] = value;
    field.setValue(nextValue);
  }

  async function processFiles(fileList: File[]) {
    if (!isMultiple()) {
      fileList = fileList.slice(0, 1);
      entries.value = [];
    }

    for (const file of fileList) {
      const key = `${inputId}-${idCounter++}`;
      const entry: FileEntryProps = {
        key,
        file: markRaw(file),
        isUploading: false,
      };

      entries.value.push(entry);

      if (!props.onUpload) {
        setValue(
          file,
          entries.value.findIndex(e => e.key === entry.key),
        );
        continue;
      }

      const reEntry = entries.value.find(e => e.key === entry.key);
      if (!reEntry) {
        continue;
      }

      entry.isUploading = true;
      const controller = new AbortController();
      abortControllers.set(entry.key, controller);
      props
        .onUpload({ file, key: entry.key, signal: controller.signal })
        .then(result => {
          if (result) {
            entry.uploadResult = result;
            setValue(
              result,
              entries.value.findIndex(e => e.key === entry.key),
            );
          }
        })
        .finally(() => {
          abortControllers.delete(entry.key);
          reEntry.isUploading = false;
        });
    }
  }

  const inputHandlers = {
    onBlur() {
      field.setTouched(true);
    },
    onChange(evt: Event) {
      if (field.isDisabled.value) {
        return;
      }

      field.setTouched(true);
      processFiles(Array.from((evt.target as HTMLInputElement).files ?? []));
      // Makes sure the input is empty to allow for re-picking the same files
      if (inputEl.value) {
        inputEl.value.value = '';
      }
    },
  };

  const handlers = {
    onDrop(evt: DragEvent) {
      if (field.isDisabled.value) {
        blockEvent(evt);
        return;
      }

      // TODO: Implement drop
    },
    async onClick(evt: MouseEvent) {
      if (field.isDisabled.value) {
        blockEvent(evt);
        return;
      }

      if (isInputElement(triggerEl.value)) {
        inputEl.value?.showPicker();
        return;
      }

      // Must be itself clicked
      blockEvent(evt);
      if (triggerEl.value === evt.target) {
        inputEl.value?.showPicker();
      }
    },
  };

  const inputProps = computed(() => {
    return withRefCapture(
      {
        id: inputId,
        tabindex: -1,
        ...propsToValues(props, ['name', 'accept', 'multiple', 'required', 'disabled']),
        ...describedByProps.value,
        ...accessibleErrorProps.value,
        ...labelledByProps.value,
        ...inputHandlers,
      },
      inputEl,
    );
  });

  const triggerProps = computed(() => {
    const isBtn = isButtonElement(triggerEl.value);

    const baseProps: Record<string, unknown> = {
      [isBtn ? 'disabled' : 'aria-disabled']: field.isDisabled.value,
      onDrop: handlers.onDrop,
      onClick: handlers.onClick,
      onBlur: inputHandlers.onBlur,
    };

    if (isBtn) {
      baseProps.type = 'button';
    }

    return withRefCapture(baseProps, triggerEl);
  });

  function clear() {
    entries.value = [];
    // Abort all pending uploads
    for (const controller of abortControllers.values()) {
      controller.abort();
    }

    abortControllers.clear();
    if (inputEl.value) {
      inputEl.value.value = '';
    }
  }

  function removeEntry(key?: string) {
    if (key) {
      removeFirst(entries.value, f => f.key === key);
      abortControllers.delete(key);
      return;
    }

    const entry = entries.value.pop();
    if (entry) {
      abortControllers.delete(entry.key);
    }
  }

  if (__DEV__) {
    registerField(field, 'File');
  }

  provide(FileEntryCollectionKey, {
    removeEntry,
    isDisabled: () => field.isDisabled.value,
  });

  return exposeField(
    {
      /**
       * The props for the input element.
       */
      inputProps,

      /**
       * The captured input element.
       */
      inputEl,

      /**
       * The props for the trigger element.
       */
      triggerProps,

      /**
       * The props for the label element.
       */
      labelProps,

      /**
       * Props for the error message element.
       */
      errorMessageProps,

      /**
       * Props for the description element.
       */
      descriptionProps,

      /**
       * Validity details for the input element.
       */
      validityDetails,

      /**
       * The file entries that are currently picked.
       */
      entries: readonly(entries),

      /**
       * Clear the files, aborts any pending uploads.
       */
      clear,

      /**
       * Remove a an entry from the list, if no key is provided, the last entry will be removed.
       */
      removeEntry,
    },
    field,
  );
}
