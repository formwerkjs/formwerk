import { computed, markRaw, provide, readonly, ref, toValue } from 'vue';
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
import { FileEntryCollectionKey } from './types';
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
}

export function useFileField(_props: Reactivify<FileFieldProps, 'schema' | 'onUpload'>) {
  let idCounter = 0;
  const props = normalizeProps(_props, ['schema', 'onUpload']);
  const inputEl = ref<HTMLInputElement>();
  const entries = ref<FileEntryProps[]>([]);
  const inputId = useUniqId(FieldTypePrefixes.FileField);
  const dropzoneEl = ref<HTMLElement>();
  const abortControllers = new Map<string, AbortController>();

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
    } else {
      field.setValue(undefined);
    }
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
    if (field.isDisabled.value) {
      blockEvent(evt);
      return;
    }

    inputEl.value?.showPicker();
  }

  const inputProps = computed(() => {
    return withRefCapture(
      {
        id: inputId,
        type: 'file',
        tabindex: -1,
        ...propsToValues(props, ['name', 'accept', 'multiple', 'required', 'disabled']),
        onBlur,
        onChange,
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
  };

  const groupProps = computed(() => {
    return withRefCapture(
      {
        role: 'group',
        'data-dragover': isDragging.value,
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
      updateFieldValue();
    }
  }

  if (__DEV__) {
    registerField(field, 'File');
  }

  provide(FileEntryCollectionKey, {
    removeEntry: remove,
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
       * The props for the group element, usually the root element.
       */
      groupProps,

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
    },
    field,
  );
}
