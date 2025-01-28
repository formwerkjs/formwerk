import { CustomInspectorNode, CustomInspectorState, InspectorNodeTag } from '@vue/devtools-kit';
import {
  DevtoolsForm,
  EncodedNode,
  InputField,
  fieldToState,
  FormContext,
  formToState,
  NODE_TYPE,
  NODE_TYPES,
  NodeState,
  PathState,
} from './types';
import { ComponentInternalInstance, toValue } from 'vue';
import { COLORS } from './config';
import { DEVTOOLS_FIELDS, DEVTOOLS_FORMS } from './storage';
import { buildFormTree } from './utils';
import { setInPath } from '@core/utils/path';

export function buildFieldState(
  state: Pick<PathState, 'errors' | 'touched' | 'dirty' | 'value' | 'valid'>,
): CustomInspectorState {
  return {
    'Field state': [
      { key: 'errors', value: state.errors },
      {
        key: 'currentValue',
        value: state.value,
      },
      {
        key: 'touched',
        value: state.touched,
      },
      {
        key: 'dirty',
        value: state.dirty,
      },
      {
        key: 'valid',
        value: state.valid,
      },
    ],
  };
}

export function buildFormState(form: FormContext): CustomInspectorState {
  const { isSubmitting, isTouched, isDirty, isValid, submitAttemptsCount, values, getErrors } = form;

  return {
    'Form state': [
      {
        key: 'submitCount',
        value: submitAttemptsCount.value,
      },
      {
        key: 'isSubmitting',
        value: isSubmitting.value,
      },
      {
        key: 'touched',
        value: isTouched.value,
      },
      {
        key: 'dirty',
        value: isDirty.value,
      },
      {
        key: 'valid',
        value: isValid.value,
      },
      {
        key: 'currentValues',
        value: values,
      },
      {
        key: 'errors',
        value: getErrors().reduce(
          (acc, error) => {
            const message = error?.messages?.[0];
            if (message) {
              acc[error?.path] = message;
            }

            return acc;
          },
          {} as Record<string, string | undefined>,
        ),
      },
    ],
  };
}

export function encodeNodeId(nodeState?: NodeState): string {
  const type = (() => {
    if (!nodeState) {
      return 'unknown';
    }

    if ('id' in nodeState) {
      return 'form';
    } else if ('path' in nodeState) {
      return 'field';
    } else {
      return 'pathState';
    }
  })();

  const ff = (() => {
    if (!nodeState) {
      return '';
    }

    if ('path' in nodeState) {
      return nodeState.path;
    } else {
      return '';
    }
  })();

  const form = (() => {
    if (!nodeState) {
      return '';
    }

    if ('id' in nodeState) {
      return nodeState.id;
    }

    if ('formId' in nodeState && nodeState.formId) {
      return nodeState.formId;
    }

    return '';
  })();

  const idObject = { f: form, ff, type } satisfies EncodedNode;

  return btoa(encodeURIComponent(JSON.stringify(idObject)));
}

export function decodeNodeId(nodeId: string): {
  field?: InputField & { _vm?: ComponentInternalInstance | null };
  form?: FormContext & { _vm?: ComponentInternalInstance | null };
  state?: PathState;
  type?: NODE_TYPE;
} {
  try {
    const idObject = JSON.parse(decodeURIComponent(atob(nodeId))) as EncodedNode;
    const form = DEVTOOLS_FORMS[idObject.f];

    // standalone field
    if (!form && idObject.ff) {
      const field = DEVTOOLS_FIELDS[idObject.ff];
      if (!field) {
        return {};
      }

      return {
        type: idObject.type,
        field,
      };
    }

    if (!form) {
      return {};
    }

    const field = form.children?.find(state => state.getPath() === idObject.ff);
    const state = formToState(form);

    return {
      type: idObject.type,
      form,
      state,
      field,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // console.error(`Devtools: [vee-validate] Failed to parse node id ${nodeId}`);
  }

  return {};
}

/**
 * Resolves the tag color based on the form state
 */
export function getValidityColors(valid: boolean) {
  return {
    bgColor: valid ? COLORS.success : COLORS.error,
    textColor: valid ? COLORS.black : COLORS.white,
  };
}

export function getFieldNodeTags(type: NODE_TYPE, valid: boolean, form: FormContext | undefined) {
  const { textColor, bgColor } = getValidityColors(valid);

  return [
    {
      label: 'Field',
      textColor,
      backgroundColor: bgColor,
    },
    !form
      ? {
          label: 'Standalone',
          textColor: COLORS.black,
          backgroundColor: COLORS.gray,
        }
      : undefined,
  ].filter(Boolean) as InspectorNodeTag[];
}

export function mapFormForDevtoolsInspector(form: DevtoolsForm): CustomInspectorNode {
  const { textColor, bgColor } = getValidityColors(form.isValid.value);
  const formState = formToState(form);

  const formTreeNodes = {};
  form.children?.forEach(state => {
    setInPath(formTreeNodes, toValue(state.getPath() ?? ''), mapFieldForDevtoolsInspector(state, form));
  });

  const { children } = buildFormTree(formTreeNodes);

  return {
    id: encodeNodeId(formState),
    label: form.context.id,
    children,
    tags: [
      {
        label: 'Form',
        textColor,
        backgroundColor: bgColor,
      },
    ],
  };
}

export function mapFieldForDevtoolsInspector(field: InputField, form?: FormContext): CustomInspectorNode {
  const fieldState = fieldToState(field, form?.context.id);
  return {
    id: encodeNodeId(fieldState),
    label: fieldState.name,
    tags: getFieldNodeTags(NODE_TYPES.field, fieldState.valid, form),
  };
}
