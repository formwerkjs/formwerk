import { CheckboxGroupProps, useCheckboxGroup } from './useCheckboxGroup';
import { type Component, defineComponent } from 'vue';
import { CheckboxProps, useCheckbox } from './useCheckbox';
import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { describe } from 'vitest';
import { flush, renderSetup, defineStandardSchema } from '@test-utils/index';

const createGroup = (
  props: CheckboxGroupProps,
  onSetup?: (group: ReturnType<typeof useCheckboxGroup>) => void,
): Component => {
  return defineComponent({
    setup() {
      const group = useCheckboxGroup(props);

      onSetup?.(group);

      return {
        ...props,
        ...group,
      };
    },
    template: `
      <div v-bind="groupProps">
      <span v-bind="labelProps">{{ label }}</span>
        <slot />
        <div v-if="errorMessageProps" v-bind="errorMessageProps" >{{ errorMessage }}</div>
        <div v-else-if="description" v-bind="descriptionProps">{{ description }}</div>
        <div data-testid="value">{{ fieldValue }}</div>
        <div data-testid="state">{{ groupState }}</div>
      </div>
    `,
  });
};

const InputBase: string = `
   <div>
    <input v-bind="inputProps" />
    <label v-bind="labelProps">{{ label }}</label>
  </div>
`;

const CustomBase: string = `
  <div>
    <div v-bind="inputProps"></div>
    <div v-bind="labelProps" >{{ label }}</div>
  </div>
`;

const createCheckbox = (template = InputBase): Component => {
  return defineComponent({
    template,
    inheritAttrs: false,
    setup(props: CheckboxProps, { attrs }) {
      const checkbox = useCheckbox({ ...props, ...attrs });

      return {
        ...props,
        ...attrs,
        ...checkbox,
      };
    },
  });
};

describe('has no a11y violations', () => {
  test('with input as base element', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox();

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('with custom elements as base', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox(CustomBase);

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

describe('click toggles the values', () => {
  test('with input as base element', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox();

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1" ]');
    await fireEvent.click(screen.getByLabelText('Second'));
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1", "2" ]');
    await fireEvent.click(screen.getByLabelText('Second'));
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1" ]');
  });

  test('with custom elements as base', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox(CustomBase);

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1" ]');
    await fireEvent.click(screen.getByLabelText('Second'));
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1", "2" ]');
    await fireEvent.click(screen.getByLabelText('Second'));
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1" ]');
  });
});

describe('Space key toggles the values', () => {
  test('with input as base element', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox();

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    await fireEvent.keyDown(screen.getByLabelText('First'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1" ]');
    await fireEvent.keyDown(screen.getByLabelText('Second'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1", "2" ]');
    await fireEvent.keyDown(screen.getByLabelText('Second'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1" ]');
  });

  test('with custom elements as base', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox(CustomBase);

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    await fireEvent.keyDown(screen.getByLabelText('First'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1" ]');
    await fireEvent.keyDown(screen.getByLabelText('Second'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1", "2" ]');
    await fireEvent.keyDown(screen.getByLabelText('Second'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1" ]');
  });
});

describe('validation', () => {
  test('picks up native error messages', async () => {
    const CheckboxGroup = createGroup({ label: 'Group', required: true });
    const Checkbox = createCheckbox();

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
          <Checkbox label="Third"  value="3" />
        </CheckboxGroup>
      `,
    });

    await fireEvent.invalid(screen.getByLabelText('First'));
    await flush();
    expect(screen.getByLabelText('Group')).toHaveErrorMessage('Constraints not satisfied');

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('should revalidate when value changes', async () => {
    const schema = defineStandardSchema<any, any>(async ({ value }) => {
      return (value as any)?.length >= 2
        ? Promise.resolve({ value: value })
        : Promise.resolve({
            issues: [{ message: 'You must select two or more options', path: [''] }],
          });
    });

    const CheckboxGroup = createGroup({ label: 'Group', schema });
    const Checkbox = createCheckbox(CustomBase);

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
          <Checkbox label="Third"  value="3" />
        </CheckboxGroup>
      `,
    });

    await fireEvent.click(screen.getByLabelText('First'));
    await flush();
    expect(screen.getByLabelText('Group')).toHaveErrorMessage('You must select two or more options');
    await fireEvent.click(screen.getByLabelText('Second'));
    await flush();
    expect(screen.getByLabelText('Group')).not.toHaveErrorMessage();
  });

  test('checkboxes do not report their error messages if part of a group', async () => {
    const { group, field } = await renderSetup(
      () => {
        return { group: useCheckboxGroup({ label: 'Group' }) };
      },
      () => {
        return { field: useCheckbox({ label: 'First' }) };
      },
    );

    group.setErrors(['Error message']);
    await flush();
    expect(field.errorMessage.value).toBe('');
    expect(group.errorMessage.value).toBe('Error message');
  });
});

describe('group state', () => {
  test('reports checked state', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox();

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
          <Checkbox label="Third"  value="3" />
        </CheckboxGroup>
      `,
    });

    expect(screen.getByTestId('state')).toHaveTextContent('unchecked');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('state')).toHaveTextContent('mixed');
    await fireEvent.click(screen.getByLabelText('Second'));
    expect(screen.getByTestId('state')).toHaveTextContent('mixed');
    await fireEvent.click(screen.getByLabelText('Third'));
    expect(screen.getByTestId('state')).toHaveTextContent('checked');
  });

  test('can set to checked or unchecked', async () => {
    let group!: ReturnType<typeof useCheckboxGroup>;
    const CheckboxGroup = createGroup({ label: 'Group' }, g => {
      group = g;
    });

    const Checkbox = createCheckbox();

    await render({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
          <Checkbox label="Third"  value="3" />
        </CheckboxGroup>
      `,
    });
    const warn = vi.spyOn(console, 'warn');
    expect(screen.getByTestId('state')).toHaveTextContent('unchecked');
    group.groupState.value = 'checked';
    await flush();
    expect(screen.getByTestId('state')).toHaveTextContent('checked');
    expect(screen.getByLabelText('First')).toBeChecked();
    expect(screen.getByLabelText('Second')).toBeChecked();
    expect(screen.getByLabelText('Third')).toBeChecked();
    expect(screen.getByTestId('value')).toHaveTextContent('[ "1", "2", "3" ]');

    group.groupState.value = 'unchecked';
    await flush();
    expect(screen.getByTestId('state')).toHaveTextContent('unchecked');
    expect(screen.getByLabelText('First')).not.toBeChecked();
    expect(screen.getByLabelText('Second')).not.toBeChecked();
    expect(screen.getByLabelText('Third')).not.toBeChecked();
    expect(screen.getByTestId('value')).toHaveTextContent('[]');

    expect(warn).not.toHaveBeenCalled();

    group.groupState.value = 'mixed';
    await flush();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
