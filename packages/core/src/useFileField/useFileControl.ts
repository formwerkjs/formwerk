import { computed, markRaw, nextTick, provide, readonly, ref, toValue, shallowRef } from 'vue';
import { Arrayable, Reactivify } from '../types';
import {
  isNullOrUndefined,
  normalizeArrayable,
  normalizeProps,
  propsToValues,
  removeFirst,
  useUniqId,
  useCaptureProps,
} from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { FormField, useFormFieldContext } from '../useFormField';
import { useConstraintsValidator, useInputValidity } from '../validation';
import { blockEvent } from '../utils/events';
import { FileEntryProps } from './useFileEntry';
import { FileEntryCollectionKey, FilePickerOptions } from './types';
import { useControlButtonProps } from '../helpers/useControlButtonProps';
import { useVModelProxy } from '../reactivity/useVModelProxy';

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

export interface FileControlProps {
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
   * The label for the remove file button.
   */
  removeButtonLabel?: string;

  /**
   * Whether the field allows directory selection.
   */
  allowDirectory?: boolean;

  /**
   * The field to use for the file control. Internal usage only.
   */
  _field?: FormField<Arrayable<File | string>>;
}

export function useFileControl(_props: Reactivify<FileControlProps, 'onUpload' | '_field'>) {
  let idCounter = 0;
  const props = normalizeProps(_props, ['onUpload', '_field']);
  const inputEl = ref<HTMLInputElement>();
  const entries = ref<FileEntryProps[]>([]);
  const inputId = useUniqId(FieldTypePrefixes.FileField);
  const dropzoneEl = shallowRef<HTMLElement>();
  const abortControllers = new Map<string, AbortController>();
  const overridePickOptions = ref<FilePickerOptions>();
  const isUploading = computed(() => entries.value.some(e => e.isUploading));
  const field = props?._field ?? useFormFieldContext();
  const { model, setModelValue } = useVModelProxy(field);
  const isDisabled = computed(() => toValue(props.disabled) || field?.isDisabled.value);

  const { element: fakeInputEl } = useConstraintsValidator({
    type: 'text',
    source: inputEl,
    required: props.required,
    // We don't have to send in the real value since we are just checking required.
    value: () => (normalizeArrayable(model.value ?? []).length > 0 ? '_' : ''),
  });

  if (field) {
    useInputValidity({ inputEl: fakeInputEl, field });
    field.registerControl({
      getControlElement: () => inputEl.value,
      getControlId: () => inputId,
    });
  }

  function isMultiple() {
    return toValue(props.multiple) ?? false;
  }

  function setValue(value: File | string, idx?: number) {
    if (!isMultiple()) {
      setModelValue(value);
      return;
    }

    if (isNullOrUndefined(idx) || idx === -1) {
      return;
    }

    const nextValue = normalizeArrayable(model.value ?? []);
    nextValue[idx] = value;
    setModelValue(nextValue);
  }

  function updateFieldValue() {
    if (isMultiple()) {
      setModelValue(entries.value.map(e => e.uploadResult ?? e.file));
      return;
    }

    if (entries.value[0]) {
      setModelValue(entries.value[0].uploadResult ?? entries.value[0].file);
      return;
    }

    setModelValue(undefined);
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
    field?.setTouched(true);
  }

  function onChange(evt: Event) {
    overridePickOptions.value = undefined;
    if (isDisabled.value) {
      return;
    }

    field?.setTouched(true);
    processFiles(Array.from((evt.target as HTMLInputElement).files ?? []));
    // Makes sure the input is empty to allow for re-picking the same files
    if (inputEl.value) {
      inputEl.value.value = '';
    }
  }

  async function onClick(evt: MouseEvent) {
    overridePickOptions.value = undefined;
    if (isDisabled.value) {
      blockEvent(evt);
      return;
    }

    inputEl.value?.showPicker();
  }

  function onCancel() {
    overridePickOptions.value = undefined;
  }

  const inputProps = useCaptureProps(() => {
    return {
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
    };
  }, inputEl);

  const triggerProps = useControlButtonProps(() => ({
    id: `${inputId}-trigger`,
    disabled: isDisabled.value,
    ...field?.accessibleErrorProps.value,
    onClick,
    onBlur,
  }));

  const removeButtonProps = useControlButtonProps(() => ({
    id: `${inputId}-remove`,
    ariaLabel: toValue(props.removeButtonLabel) ?? 'Remove file',
    disabled: isDisabled.value,
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
      isDragging.value = false;
      if (isDisabled.value) {
        return;
      }

      processFiles(Array.from(evt.dataTransfer?.files ?? []));
    },
    onClick(e: MouseEvent) {
      if (isDisabled.value) {
        blockEvent(e);
        return;
      }

      if (e.target === dropzoneEl.value) {
        inputEl.value?.showPicker();
      }
    },
  };

  const dropzoneProps = useCaptureProps(() => {
    return {
      role: 'group',
      'data-dragover': isDragging.value,
      'aria-label': toValue(field?.label),
      ...dropzoneHandlers,
    };
  }, dropzoneEl);

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

  provide(FileEntryCollectionKey, {
    removeEntry: remove,
    isDisabled: () => isDisabled.value ?? false,
    getRemoveButtonLabel: () => toValue(props.removeButtonLabel) ?? 'Remove file',
  });

  return {
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
  };
}
