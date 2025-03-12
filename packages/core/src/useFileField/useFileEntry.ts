import { computed, type DefineComponent, defineComponent, h, inject, toRefs, toValue, type VNode } from 'vue';
import { Reactivify } from '../types';
import { normalizeProps, warn } from '../utils/common';
import { FileEntryCollectionKey } from './types';
import { Simplify } from 'type-fest';
import { useControlButtonProps } from '../helpers/useControlButtonProps';

export interface FileEntryProps {
  /**
   * The key of the file entry.
   */
  key: string;

  /**
   * The file object.
   */
  file: File;

  /**
   * Whether the file is being uploaded.
   */
  isUploading: boolean;

  /**
   * The result of the upload.
   */
  uploadResult?: string;

  /**
   * The label of the remove button.
   */
  removeButtonLabel?: string;
}

export function useFileEntry(_props: Reactivify<FileEntryProps>) {
  const props = normalizeProps(_props);
  const collection = inject(FileEntryCollectionKey);
  if (__DEV__) {
    if (!collection) {
      warn('File entries require a parent FileField to be used, some features may not work as expected.');
    }
  }

  const removeEntry = () => {
    collection?.removeEntry(toValue(props.key));
  };

  const isUploaded = computed(() => {
    return !toValue(props.isUploading) && toValue(props.uploadResult);
  });

  const removeButtonProps = useControlButtonProps(() => ({
    onClick: removeEntry,
    disabled: toValue(props.isUploading) || collection?.isDisabled(),
    'aria-label': toValue(props.removeButtonLabel) || 'Remove file',
  }));

  return {
    removeEntry,
    isUploaded,
    removeButtonProps,
  };
}

type KeyLessFileEntryProps = Simplify<Omit<FileEntryProps, 'key'>>;

export interface FileEntrySlotProps {
  removeEntry: () => void;
  isUploaded: boolean;
  isUploading: boolean;
  removeButtonProps: {
    onClick: () => void;
    disabled: boolean;
  };
}

/**
 * A helper component that renders a span. You can build your own with `useFileEntry`.
 */
const FileEntryImpl = /*#__PURE__*/ defineComponent<KeyLessFileEntryProps & { as?: string }>({
  name: 'FileEntry',
  props: ['file', 'isUploading', 'uploadResult', 'as'],
  setup(props, { slots, attrs }) {
    const refs = toRefs(props);
    const { removeEntry, isUploaded, removeButtonProps } = useFileEntry({
      ...refs,
      key: attrs.key as string,
    });

    return () =>
      h(
        props.as || 'span',
        {},
        {
          default: () =>
            slots.default?.({
              removeEntry,
              isUploaded: isUploaded.value,
              isUploading: props.isUploading,
              removeButtonProps: removeButtonProps.value,
            }),
        },
      );
  },
});

export const FileEntry = FileEntryImpl as unknown as DefineComponent<KeyLessFileEntryProps & { as?: string }> & {
  new (): {
    $slots: {
      default: (args: FileEntrySlotProps) => VNode[];
    };
  };
};
