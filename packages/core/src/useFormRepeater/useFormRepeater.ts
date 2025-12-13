import {
  type DefineComponent,
  defineComponent,
  h,
  inject,
  type MaybeRefOrGetter,
  nextTick,
  onMounted,
  readonly,
  ref,
  toValue,
  VNode,
  watch,
  shallowRef,
} from 'vue';
import { FormObject, Numberish, Reactivify } from '../types';
import { FormKey, FormReturns } from '../useForm';
import {
  cloneDeep,
  fromNumberish,
  isEqual,
  isNullOrUndefined,
  normalizeProps,
  useUniqId,
  warn,
  useCaptureProps,
} from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { createPathPrefixer } from '../helpers/usePathPrefixer';
import { prefixPath } from '../utils/path';

export interface FormRepeaterProps<TForm extends FormObject = FormObject> {
  /**
   * The name/path of the repeater field.
   */
  name: string;

  /**
   * The minimum number of iterations allowed.
   */
  min?: Numberish;

  /**
   * The maximum number of iterations allowed.
   */
  max?: Numberish;

  /**
   * The label for the add button.
   */
  addButtonLabel?: string;

  /**
   * The label for the remove button.
   */
  removeButtonLabel?: string;

  /**
   * The label for the move up button.
   */
  moveUpButtonLabel?: string;

  /**
   * The label for the move down button.
   */
  moveDownButtonLabel?: string;

  /**
   * The form object returned from `useForm`. If not provided, will attempt to inject from parent.
   * Use this when `useFormRepeater` is called in the same component as `useForm`.
   */
  form?: FormReturns<TForm>;
}

export interface FormRepeaterButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface FormRepeaterButtonDomProps {
  type: 'button' | undefined;
  role: 'button' | undefined;
  disabled?: boolean | undefined;
  'aria-disabled'?: boolean | undefined;
  'aria-label': string;
  onClick: () => void;
}

export interface FormRepeaterIterationProps {
  /**
   * The index of the current repeated item. This is required.
   */
  index: number;

  /**
   * The tag name to render the iteration as.
   */
  as?: string;
}

export interface FormRepeaterIterationSlotProps {
  /**
   * Props for the move item down button.
   */
  moveDownButtonProps: FormRepeaterButtonDomProps;

  /**
   * Props for the move item up button.
   */
  moveUpButtonProps: FormRepeaterButtonDomProps;

  /**
   * Props for the remove item button.
   */
  removeButtonProps: FormRepeaterButtonDomProps;
}

export function useFormRepeater<TItem = unknown>(_props: Reactivify<FormRepeaterProps, 'form'>) {
  const id = useUniqId(FieldTypePrefixes.FormRepeater);
  let counter = 0;
  const repeaterProps = normalizeProps(_props, ['form']);
  // Use the provided form prop, or fall back to injecting from parent
  const form = repeaterProps.form?.context ?? inject(FormKey, null);

  const getPath = () => toValue(repeaterProps.name);
  const getPathValue = () => (form?.getValue(getPath()) || []) as TItem[];
  let lastControlledValueSnapshot: TItem[] | undefined;
  const records = ref(buildRecords());

  function generateRecord(): string {
    return `${id}-${counter++}`;
  }

  function buildRecords(): string[] {
    const pathArray = getPathValue();
    const length = Math.max(fromNumberish(repeaterProps.min) ?? 0, pathArray.length);
    lastControlledValueSnapshot = cloneDeep(pathArray);

    return Array.from({ length }).fill(null).map(generateRecord);
  }

  if (__DEV__) {
    if (!form) {
      warn(
        'No form context was found for useFormRepeater, either provide a form prop or call useFormRepeater within a useForm component.',
      );
    }

    if (!getPath()) {
      warn('"name" prop is required for useFormRepeater');
    }
  }

  async function mutateWith(mutate: () => void) {
    mutate();
    await nextTick();
    lastControlledValueSnapshot = cloneDeep(getPathValue());
  }

  function canAdd(count = 1) {
    const max = fromNumberish(repeaterProps.max);
    if (!max) {
      return true;
    }

    return records.value.length + count <= max;
  }

  function canRemove(count = 1) {
    const min = fromNumberish(repeaterProps.min);
    if (!min) {
      return true;
    }

    return records.value.length - count >= min;
  }

  function add(count = 1) {
    if (!canAdd(count)) {
      if (__DEV__) {
        warn(`Cannot add ${count} item(s) to repeater since max is ${toValue(repeaterProps.max)}`);
      }

      return;
    }

    mutateWith(() => {
      for (let i = 0; i < count; i++) {
        records.value.push(generateRecord());
      }
    });
  }

  function remove(index: number) {
    if (!canRemove()) {
      if (__DEV__) {
        warn(`Cannot remove item from repeater since min is ${toValue(repeaterProps.min)}`);
      }

      return;
    }

    // Queue ARRAY_MUT transaction with the new array value (item removed)
    if (form) {
      const currentArray = cloneDeep(getPathValue()) ?? [];
      if (Array.isArray(currentArray) && index < currentArray.length) {
        const newArray = [...currentArray];
        newArray.splice(index, 1);
        form.transaction((_, { ARRAY_MUT }) => ({
          kind: ARRAY_MUT,
          path: getPath(),
          value: newArray,
        }));
      }
    }

    mutateWith(() => {
      records.value.splice(index, 1);
    });
  }

  function insert(index: number) {
    if (!canAdd()) {
      if (__DEV__) {
        warn(`Cannot insert item to repeater since max is ${toValue(repeaterProps.max)}`);
      }

      return;
    }

    if (index < 0 || index > records.value.length) {
      if (__DEV__) {
        warn(`Cannot insert item at index ${index} since it is out of bounds`);
      }

      return;
    }

    // Queue ARRAY_MUT transaction with the new array value (item inserted)
    if (form) {
      const currentArray = cloneDeep(getPathValue()) ?? [];
      if (Array.isArray(currentArray)) {
        const newArray = [...currentArray];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newArray.splice(index, 0, undefined as any);
        form.transaction((_, { ARRAY_MUT }) => ({
          kind: ARRAY_MUT,
          path: getPath(),
          value: newArray,
        }));
      }
    }

    mutateWith(() => {
      records.value.splice(index, 0, generateRecord());
    });
  }

  function move(from: number, to: number) {
    if (from === to) {
      if (__DEV__) {
        warn('Cannot move item to the same index');
      }

      return;
    }

    if (from < 0 || from >= records.value.length || to < 0 || to >= records.value.length) {
      if (__DEV__) {
        warn(`Cannot move item from ${from} to ${to} since it is out of bounds`);
      }

      return;
    }

    mutateWith(() => {
      records.value.splice(to, 0, records.value.splice(from, 1)[0]);
    });
  }

  function swap(indexA: number, indexB: number) {
    if (indexA === indexB) {
      if (__DEV__) {
        warn('Cannot swap item with itself');
      }

      return;
    }

    if (indexA < 0 || indexA >= records.value.length || indexB < 0 || indexB >= records.value.length) {
      if (__DEV__) {
        warn(`Cannot swap item from ${indexA} to ${indexB} since it is out of bounds`);
      }

      return;
    }

    mutateWith(() => {
      const newRecords = [...records.value];
      newRecords[indexA] = records.value[indexB];
      newRecords[indexB] = records.value[indexA];
      records.value = newRecords;
    });
  }

  const addButtonProps = createBtnProps({
    label: () => toValue(repeaterProps.addButtonLabel) ?? 'Add',
    onClick: () => add(),
    disabled: () => !canAdd(),
  });

  function createIterationButtonProps(index: MaybeRefOrGetter<number>) {
    const removeButtonProps = createBtnProps({
      label: () => toValue(repeaterProps.removeButtonLabel) ?? 'Remove',
      disabled: () => !canRemove(),
      onClick: () => remove(toValue(index)),
    });

    const moveUpButtonProps = createBtnProps({
      label: () => toValue(repeaterProps.moveUpButtonLabel) ?? 'Move up',
      disabled: () => toValue(index) === 0,
      onClick: () => {
        move(toValue(index), toValue(index) - 1);
      },
    });

    const moveDownButtonProps = createBtnProps({
      label: () => toValue(repeaterProps.moveDownButtonLabel) ?? 'Move down',
      disabled: () => toValue(index) === records.value.length - 1,
      onClick: () => {
        const idx = toValue(index);

        move(idx, idx + 1);
      },
    });

    return {
      removeButtonProps,
      moveUpButtonProps,
      moveDownButtonProps,
    };
  }

  const Iteration = defineComponent<{ index: number; as?: string; noButtonProps?: boolean }>({
    name: 'FormRepeaterIteration',
    props: {
      as: { type: String, required: false },
      index: Number,
    },
    setup(props, { slots, attrs }) {
      // Prefixes the path with the index of the repeater
      // If a path is not provided, even as an empty string, it will be considered an uncontrolled path.
      // This is a minor divergence from the controlled/uncontrolled behavior of form fields,
      createPathPrefixer(path =>
        isNullOrUndefined(path) ? undefined : prefixPath(getPath(), `${props.index}${path ? `.${path}` : ''}`),
      );

      const { removeButtonProps, moveUpButtonProps, moveDownButtonProps } = createIterationButtonProps(
        () => props.index,
      );

      const getSlotProps = () => ({
        removeButtonProps: removeButtonProps.value,
        moveUpButtonProps: moveUpButtonProps.value,
        moveDownButtonProps: moveDownButtonProps.value,
      });

      return () => {
        if (props.as) {
          return h(props.as, attrs, { default: () => slots.default?.(getSlotProps()) });
        }

        return slots.default?.(getSlotProps());
      };
    },
  });

  if (form) {
    onMounted(() => {
      watch(getPathValue, value => {
        if (!isEqual(value, lastControlledValueSnapshot)) {
          records.value = buildRecords();
        }
      });
    });
  }

  return {
    /**
     * The items in the repeater.
     */
    items: readonly(records),
    /**
     * Props for the add item button.
     */
    addButtonProps,
    /**
     * Adds a number of items to the repeater, defaulting to 1. Cannot exceed the max.
     */
    add,
    /**
     * Swaps two items in the repeater.
     */
    swap,
    /**
     * Removes an item from the repeater. Cannot go below the min.
     */
    remove,
    /**
     * Moves an item in the repeater from one index to another.
     */
    move,
    /**
     * Inserts an item into the repeater at a given index.
     */
    insert,
    /**
     * The iteration component. You should use this component to wrap each repeated item.
     */
    Iteration: Iteration as unknown as DefineComponent<FormRepeaterIterationProps> & {
      new (): {
        $slots: {
          default: (args: FormRepeaterIterationSlotProps) => VNode[];
        };
      };
    },
  };
}

function createBtnProps(_props: Reactivify<FormRepeaterButtonProps, 'onClick'>) {
  const props = normalizeProps(_props, ['onClick']);
  const buttonEl = shallowRef<HTMLElement>();

  const buttonProps = useCaptureProps<FormRepeaterButtonDomProps>(() => {
    const isBtnTag = buttonEl.value?.tagName === 'BUTTON';

    return {
      'aria-label': toValue(props.label),
      type: isBtnTag ? 'button' : undefined,
      role: isBtnTag ? undefined : 'button',
      onClick: props.onClick,
      disabled: isBtnTag ? (toValue(props.disabled) ?? undefined) : undefined,
      'aria-disabled': isBtnTag ? undefined : (toValue(props.disabled) ?? undefined),
    };
  }, buttonEl);

  return buttonProps;
}
