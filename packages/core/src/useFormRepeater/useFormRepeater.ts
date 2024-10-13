import { computed, defineComponent, Fragment, h, inject, nextTick, ref, toValue, VNode, watch } from 'vue';
import { Numberish, Reactivify } from '../types';
import { FormKey } from '../useForm';
import { cloneDeep, isEqual, normalizeProps, useUniqId, warn } from '../utils/common';
import { FieldTypePrefixes } from '../constants';

export interface FormRepeaterProps {
  name: string;

  min?: Numberish;
  max?: Numberish;

  addButtonLabel?: string;
  removeButtonLabel?: string;
  moveUpButtonLabel?: string;
  moveDownButtonLabel?: string;
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

export interface FormRepeaterIterationSlotProps {
  index: number;
  path: string;
  moveDownButtonProps: FormRepeaterButtonDomProps;
  moveUpButtonProps: FormRepeaterButtonDomProps;
  removeButtonProps: FormRepeaterButtonDomProps;
}

export function useFormRepeater<TItem = unknown>(_props: Reactivify<FormRepeaterProps>) {
  const id = useUniqId(FieldTypePrefixes.FormRepeater);
  let counter = 0;
  const form = inject(FormKey);
  const repeaterProps = normalizeProps(_props);
  const getPath = () => toValue(repeaterProps.name);
  const getPathValue = () => (form?.getFieldValue(getPath()) || []) as TItem[];
  const records = ref(buildRecords());
  let lastControlledValueSnapshot: TItem[] | undefined = cloneDeep(getPathValue());

  function generateRecord(): string {
    return `${id}-${counter++}`;
  }

  function buildRecords(): string[] {
    const pathArray = getPathValue();
    const length = Math.max(Number(toValue(repeaterProps.min) ?? 0), pathArray.length);

    return Array.from({ length }).fill(null).map(generateRecord);
  }

  if (__DEV__) {
    if (!getPath()) {
      warn('"name" prop is required for useFormRepeater');
    }

    if (!form) {
      warn('form context is required for useFormRepeater');
    }
  }

  async function mutateWith(mutate: () => void) {
    mutate();
    await nextTick();
    lastControlledValueSnapshot = cloneDeep(getPathValue());
  }

  function canAdd(count = 1) {
    const max = Number(toValue(repeaterProps.max));
    if (!max) {
      return true;
    }

    return records.value.length + count <= max;
  }

  function canRemove(count = 1) {
    const min = Number(toValue(repeaterProps.min));
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

    mutateWith(() => {
      records.value.splice(index, 0, generateRecord());
    });
  }

  function move(from: number, to: number) {
    mutateWith(() => {
      records.value.splice(to, 0, records.value.splice(from, 1)[0]);
    });
  }

  function swap(indexA: number, indexB: number) {
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

  const Repeat = defineComponent({
    name: 'FormRepeater',
    setup(_, { slots }) {
      return () => {
        return records.value.map((key, index) => {
          const removeButtonProps = createBtnProps({
            label: () => toValue(repeaterProps.removeButtonLabel) ?? 'Remove',
            disabled: () => !canRemove(),
            onClick: () => remove(index),
          });

          const moveUpButtonProps = createBtnProps({
            label: () => toValue(repeaterProps.moveUpButtonLabel) ?? 'Move up',
            disabled: () => index === 0,
            onClick: () => {
              move(index, index - 1);
            },
          });

          const moveDownButtonProps = createBtnProps({
            label: () => toValue(repeaterProps.moveDownButtonLabel) ?? 'Move down',
            disabled: () => index === records.value.length - 1,
            onClick: () => {
              const idx = index;

              move(idx, idx + 1);
            },
          });

          return h(
            Fragment,
            { key },
            slots.default?.({
              index,
              path: `${getPath()}.${index}`,
              moveDownButtonProps: moveDownButtonProps.value,
              moveUpButtonProps: moveUpButtonProps.value,
              removeButtonProps: removeButtonProps.value,
            }),
          );
        });
      };
    },
  });

  watch(getPathValue, value => {
    if (!isEqual(value, lastControlledValueSnapshot)) {
      lastControlledValueSnapshot = cloneDeep(value);
      records.value = buildRecords();
    }
  });

  return {
    addButtonProps,
    add,
    swap,
    remove,
    move,
    insert,
    Repeat: Repeat as typeof Repeat & {
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

  const buttonProps = computed<FormRepeaterButtonDomProps>(() => {
    return {
      'aria-label': toValue(props.label),
      type: 'button',
      role: 'button',
      onClick: props.onClick,
      disabled: toValue(props.disabled) ?? undefined,
      'aria-disabled': toValue(props.disabled) ?? undefined,
    };
  });

  return buttonProps;
}
