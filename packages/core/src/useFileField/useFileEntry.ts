import {
  computed,
  type DefineComponent,
  defineComponent,
  h,
  inject,
  onUnmounted,
  ref,
  shallowRef,
  toValue,
  type VNode,
  watch,
} from 'vue';
import { Reactivify } from '../types';
import { normalizeProps, warn, withRefCapture } from '../utils/common';
import { FileEntryCollectionKey } from './types';
import { Simplify } from 'type-fest';
import { useControlButtonProps } from '../helpers/useControlButtonProps';

export interface FileEntryProps {
  /**
   * The id of the file entry.
   */
  id: string;

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
  const previewEl = ref<HTMLElement>();
  const currentObjectURL = shallowRef<string>();

  if (__DEV__) {
    if (!collection) {
      warn('File entries require a parent FileField to be used, some features may not work as expected.');
    }
  }

  // Clear the current object URL when the file changes
  watch(props.file, () => {
    currentObjectURL.value = undefined;
  });

  const removeEntry = () => {
    collection?.removeEntry(toValue(props.id));
  };

  const isUploaded = computed(() => {
    return !toValue(props.isUploading) && toValue(props.uploadResult);
  });

  const removeButtonProps = useControlButtonProps(() => ({
    onClick: removeEntry,
    disabled: toValue(props.isUploading) || collection?.isDisabled(),
    'aria-label': toValue(props.removeButtonLabel) || 'Remove file',
  }));

  function createPreviewProps() {
    if (!currentObjectURL.value) {
      // TODO: Maybe file is too large to be previewed?
      currentObjectURL.value = URL.createObjectURL(toValue(props.file));
    }

    const file = toValue(props.file);
    if (previewEl.value?.tagName === 'IMG' || file.type.startsWith('image/')) {
      return {
        as: 'img',
        src: currentObjectURL.value,
        alt: props.file.name,
      };
    }

    if (previewEl.value?.tagName === 'VIDEO' || file.type.startsWith('video/')) {
      return {
        as: 'video',
        src: currentObjectURL.value,
        controls: false,
        muted: true,
        loop: true,
        autoplay: true,
        playsinline: true,
      };
    }

    return {};
  }

  onUnmounted(() => {
    if (currentObjectURL.value) {
      URL.revokeObjectURL(currentObjectURL.value);
    }

    currentObjectURL.value = undefined;
  });

  const previewProps = computed(() => {
    return withRefCapture(createPreviewProps(), previewEl);
  });

  return {
    removeEntry,
    isUploaded,
    previewProps,
    removeButtonProps,
  };
}

type KeyLessFileEntryProps = Simplify<Omit<FileEntryProps, 'key'>>;

export interface FileEntrySlotProps {
  removeEntry: () => void;
  isUploaded: boolean;
  isUploading: boolean;
  hasPreview: boolean;
  previewProps: { as: string };
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
  props: ['id', 'file', 'isUploading', 'uploadResult', 'as'],
  setup(props, { slots }) {
    const { removeEntry, isUploaded, removeButtonProps, previewProps } = useFileEntry(props);

    return () =>
      h(
        props.as || 'span',
        { key: props.id },
        {
          default: () =>
            slots.default?.({
              removeEntry,
              isUploaded: isUploaded.value,
              isUploading: props.isUploading,
              hasPreview: !!previewProps.value.as,
              removeButtonProps: removeButtonProps.value,
              previewProps: previewProps.value,
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
