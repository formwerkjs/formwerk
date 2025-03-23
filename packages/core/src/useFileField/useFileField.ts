import { computed, markRaw, nextTick, provide, readonly, ref, toValue } from 'vue';
import { Arrayable, Reactivify, StandardSchema } from '../types';
import {
  isNullOrUndefined,
  normalizeArrayable,
  normalizeProps,
  propsToValues,
  removeFirst,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { useErrorMessage } from '../a11y';
import { exposeField, useFormField } from '../useFormField';
import { useConstraintsValidator, useInputValidity } from '../validation';
import { blockEvent } from '../utils/events';
import { registerField } from '@formwerk/devtools';
import { FileEntryProps } from './useFileEntry';
import { FileEntryCollectionKey, FilePickerOptions } from './types';
import { useControlButtonProps } from '../helpers/useControlButtonProps';

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
   * Whether the field is disabled.
   */
  disabled?: boolean;

  /**
   * The model value for the field.
   */
  modelValue?: string;

  /**
   * The value of the field.
   */
  value?: string;

  /**
   * Handles the file upload, this function is called when the user selects a file, and is called for new picked files.
   */
  onUpload?: (context: FileUploadContext) => Promise<string | undefined>;

  /**
   * The schema for the field.
   */
  schema?: StandardSchema<Arrayable<File>>;

  /**
   * The label for the remove file button.
   */
  removeButtonLabel?: string;

  /**
   * Whether the field allows directory selection.
   */
  allowDirectory?: boolean;
}

export function useFileField(_props: Reactivify<FileFieldProps, 'schema' | 'onUpload'>) {
  let idCounter = 0;
  const props = normalizeProps(_props, ['schema', 'onUpload']);
  const inputEl = ref<HTMLInputElement>();
  const entries = ref<FileEntryProps[]>([]);
  const inputId = useUniqId(FieldTypePrefixes.FileField);
  const dropzoneEl = ref<HTMLElement>();
  const abortControllers = new Map<string, AbortController>();
  const overridePickOptions = ref<FilePickerOptions>();

  const isUploading = computed(() => entries.value.some(e => e.isUploading));

  const field = useFormField<Arrayable<File | string>>({
    path: props.name,
    disabled: props.disabled,
    schema: props.schema,
  });

  const { element: fakeInputEl } = useConstraintsValidator({
    type: 'text',
    source: inputEl,
    required: props.required,
    // We don't have to send in the real value since we are just checking required.
    value: () => (normalizeArrayable(field.fieldValue.value ?? []).length > 0 ? '_' : ''),
  });

  const { validityDetails } = useInputValidity({ inputEl: fakeInputEl, field });

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

  function updateFieldValue() {
    if (isMultiple()) {
      field.setValue(entries.value.map(e => e.uploadResult ?? e.file));
      return;
    }

    if (entries.value[0]) {
      field.setValue(entries.value[0].uploadResult ?? entries.value[0].file);
      return;
    }

    field.setValue(undefined);
  }

  async function processFiles(fileList: File[]) {
    if (!isMultiple()) {
      fileList = fileList.slice(0, 1);
      entries.value = [];
    }

    for (const file of fileList) {
      const key = `${inputId}-${idCounter++}`;
      const entry: FileEntryProps = {
        id: key,
        file: markRaw(file),
        isUploading: false,
      };

      entries.value.push(entry);

      if (!props.onUpload) {
        setValue(
          file,
          entries.value.findIndex(e => e.id === entry.id),
        );
        continue;
      }

      const reEntry = entries.value.find(e => e.id === entry.id);
      if (!reEntry) {
        continue;
      }

      entry.isUploading = true;
      const controller = new AbortController();
      abortControllers.set(entry.id, controller);
      props
        .onUpload({ file, key: entry.id, signal: controller.signal })
        .then(result => {
          if (result) {
            entry.uploadResult = result;
            setValue(
              result,
              entries.value.findIndex(e => e.id === entry.id),
            );
          }
        })
        .finally(() => {
          abortControllers.delete(entry.id);
          reEntry.isUploading = false;
        });
    }
  }

  function onBlur() {
    field.setTouched(true);
  }

  function onChange(evt: Event) {
    overridePickOptions.value = undefined;
    if (field.isDisabled.value) {
      return;
    }

    field.setTouched(true);
    processFiles(Array.from((evt.target as HTMLInputElement).files ?? []));
    // Makes sure the input is empty to allow for re-picking the same files
    if (inputEl.value) {
      inputEl.value.value = '';
    }
  }

  async function onClick(evt: MouseEvent) {
    overridePickOptions.value = undefined;
    if (field.isDisabled.value) {
      blockEvent(evt);
      return;
    }

    inputEl.value?.showPicker();
  }

  function onCancel() {
    overridePickOptions.value = undefined;
  }

  const inputProps = computed(() => {
    return withRefCapture(
      {
        id: inputId,
        type: 'file',
        tabindex: -1,
        ...propsToValues(props, ['name', 'accept', 'multiple', 'required', 'disabled']),
        ...overridePickOptions.value,
        onBlur,
        onChange,
        onCancel,
        webkitdirectory: isMultiple() ? toValue(props.allowDirectory) : undefined,
        style: {
          display: 'none',
        },
      },
      inputEl,
    );
  });

  const triggerProps = useControlButtonProps(() => ({
    id: `${inputId}-trigger`,
    disabled: field.isDisabled.value,
    ...accessibleErrorProps.value,
    onClick,
    onBlur,
  }));

  const removeButtonProps = useControlButtonProps(() => ({
    id: `${inputId}-remove`,
    ariaLabel: toValue(props.removeButtonLabel) ?? 'Remove file',
    disabled: field.isDisabled.value,
    onClick: () => remove(),
  }));

  const isDragging = ref(false);

  const dropzoneHandlers = {
    onDragenter(evt: DragEvent) {
      blockEvent(evt);
    },
    onDragover(evt: DragEvent) {
      blockEvent(evt);
      isDragging.value = true;
    },
    onDragleave(evt: DragEvent) {
      blockEvent(evt);
      isDragging.value = false;
    },
    onDrop(evt: DragEvent) {
      blockEvent(evt);
      if (field.isDisabled.value) {
        return;
      }

      processFiles(Array.from(evt.dataTransfer?.files ?? []));
    },
    onClick(e: MouseEvent) {
      if (field.isDisabled.value) {
        blockEvent(e);
        return;
      }

      if (e.target === dropzoneEl.value) {
        inputEl.value?.showPicker();
      }
    },
  };

  const dropzoneProps = computed(() => {
    return withRefCapture(
      {
        role: 'group',
        'data-dragover': isDragging.value,
        'aria-label': toValue(props.label),
        ...dropzoneHandlers,
      },
      dropzoneEl,
    );
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

    updateFieldValue();
  }

  async function showPicker(opts?: FilePickerOptions) {
    overridePickOptions.value = opts;
    await nextTick();
    inputEl.value?.showPicker();
  }

  function remove(key?: string | FileEntryProps | Event) {
    if (key instanceof Event) {
      key = undefined;
    }

    if (key && typeof key === 'object') {
      key = key.id;
    }

    if (key) {
      const controller = abortControllers.get(key);
      controller?.abort();
      removeFirst(entries.value, f => f.id === key);
      abortControllers.delete(key);
      updateFieldValue();
      return;
    }

    const entry = entries.value.pop();
    if (entry) {
      const controller = abortControllers.get(entry.id);
      controller?.abort();
      abortControllers.delete(entry.id);
    }

    updateFieldValue();
  }

  if (__DEV__) {
    registerField(field, 'File');
  }

  provide(FileEntryCollectionKey, {
    removeEntry: remove,
    isDisabled: () => field.isDisabled.value,
    getRemoveButtonLabel: () => toValue(props.removeButtonLabel) ?? 'Remove file',
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
       * The props for the dropzone element, usually the root element.
       */
      dropzoneProps,

      /**
       * Props for the error message element.
       */
      errorMessageProps,

      /**
       * Validity details for the input element.
       */
      validityDetails,

      /**
       * The file entries that are currently picked.
       */
      entries: readonly(entries),

      /**
       * The file entry that is currently picked.
       */
      entry: computed(() => entries.value[entries.value.length - 1]),

      /**
       * Clear the files, aborts any pending uploads.
       */
      clear,

      /**
       * Remove a an entry from the list, if no key is provided, the last entry will be removed.
       */
      remove,

      /**
       * Whether the dropzone element has items being dragged over it.
       */
      isDragging,

      /**
       * The props for the remove file button.
       */
      removeButtonProps,

      /**
       * Whether the field is uploading, if multiple files are picked, this will be true if any of the files are uploading.
       */
      isUploading,

      /**
       * Shows the file picker with the given options. Useful for a picker-type implementations.
       */
      showPicker,
    },
    field,
  );
}
