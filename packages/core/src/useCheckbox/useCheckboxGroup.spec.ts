import { CheckboxGroupProps, useCheckboxGroup } from './useCheckboxGroup';
import { type Component, defineComponent } from 'vue';
import { CheckboxProps, useCheckbox } from './useCheckbox';
import { describe } from 'vitest';
import { renderSetup, defineStandardSchema, expectNoA11yViolations, appRender } from '@test-utils/index';
import { page } from 'vitest/browser';

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
    <div v-bind="inputProps" style="width: 100px; height: 100px;"></div>
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

describe('click toggles the values', () => {
  test('with input as base element', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox();

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    await page.getByLabelText('First').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1" ]');
    await page.getByLabelText('Second').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1", "2" ]');
    await page.getByLabelText('Second').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1" ]');
  });

  test('with custom elements as base', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox(CustomBase);

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    await page.getByLabelText('First').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1" ]');
    await page.getByLabelText('Second').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1", "2" ]');
    await page.getByLabelText('Second').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1" ]');
  });
});

describe('Space key toggles the values', () => {
  test('with input as base element', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox();

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1" ]');
    (await page.getByLabelText('Second').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1", "2" ]');
    (await page.getByLabelText('Second').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1" ]');
  });

  test('with custom elements as base', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox(CustomBase);

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1" ]');
    (await page.getByLabelText('Second').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1", "2" ]');
    (await page.getByLabelText('Second').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1" ]');
  });
});

describe('validation', () => {
  test('picks up native error messages', async () => {
    const CheckboxGroup = createGroup({ label: 'Group', required: true });
    const Checkbox = createCheckbox();

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
          <Checkbox label="Third"  value="3" />
        </CheckboxGroup>
      `,
    });

    (await page.getByLabelText('First').element()).dispatchEvent(new Event('invalid', { bubbles: true }));

    // The group itself isn't a native input, so validate by ARIA state.
    await expect.element(page.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
  });

  test('should revalidate when value changes', async () => {
    const schema = defineStandardSchema<any, any>(async value => {
      return (value as any)?.length >= 2
        ? Promise.resolve({ value: value })
        : Promise.resolve({
            issues: [{ message: 'You must select two or more options', path: [''] }],
          });
    });

    let group!: ReturnType<typeof useCheckboxGroup>;
    const CheckboxGroup = createGroup({ label: 'Group', schema }, g => {
      group = g;
    });
    const Checkbox = createCheckbox(CustomBase);

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
          <Checkbox label="Third"  value="3" />
        </CheckboxGroup>
      `,
    });

    await page.getByLabelText('First').click();
    await expect.poll(() => group.errorMessage.value).toBe('You must select two or more options');
    await page.getByLabelText('Second').click();
    await expect.poll(() => group.errorMessage.value).toBe('');
  });

  test('checkboxes do not report their error messages if part of a group', async () => {
    const { group, field } = renderSetup(
      () => {
        return { group: useCheckboxGroup({ label: 'Group' }) };
      },
      () => {
        return { field: useCheckbox({ label: 'First' }) };
      },
    );

    group.setErrors(['Error message']);
    await expect.poll(() => field.errorMessage.value).toBe('');
    await expect.poll(() => group.errorMessage.value).toBe('Error message');
  });
});

describe('a11y', () => {
  test('with input as base element', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox();

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('with custom elements as base', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox(CustomBase);

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
        </CheckboxGroup>
      `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});

describe('group state', () => {
  test('reports checked state', async () => {
    const CheckboxGroup = createGroup({ label: 'Group' });
    const Checkbox = createCheckbox();

    appRender({
      components: { CheckboxGroup, Checkbox },
      template: `
        <CheckboxGroup data-testid="fixture">
          <Checkbox label="First" value="1" />
          <Checkbox label="Second" value="2" />
          <Checkbox label="Third"  value="3" />
        </CheckboxGroup>
      `,
    });

    await expect.element(page.getByTestId('state')).toHaveTextContent('unchecked');
    await page.getByLabelText('First').click();
    await expect.element(page.getByTestId('state')).toHaveTextContent('mixed');
    await page.getByLabelText('Second').click();
    await expect.element(page.getByTestId('state')).toHaveTextContent('mixed');
    await page.getByLabelText('Third').click();
    await expect.element(page.getByTestId('state')).toHaveTextContent('checked');
  });

  test('can set to checked or unchecked', async () => {
    let group!: ReturnType<typeof useCheckboxGroup>;
    const CheckboxGroup = createGroup({ label: 'Group' }, g => {
      group = g;
    });

    const Checkbox = createCheckbox();

    appRender({
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
    await expect.element(page.getByTestId('state')).toHaveTextContent('unchecked');
    group.groupState.value = 'checked';
    await expect.element(page.getByTestId('state')).toHaveTextContent('checked');
    await expect.element(page.getByLabelText('First')).toBeChecked();
    await expect.element(page.getByLabelText('Second')).toBeChecked();
    await expect.element(page.getByLabelText('Third')).toBeChecked();
    await expect.element(page.getByTestId('value')).toHaveTextContent('[ "1", "2", "3" ]');

    group.groupState.value = 'unchecked';
    await expect.element(page.getByTestId('state')).toHaveTextContent('unchecked');
    await expect.element(page.getByLabelText('First')).not.toBeChecked();
    await expect.element(page.getByLabelText('Second')).not.toBeChecked();
    await expect.element(page.getByLabelText('Third')).not.toBeChecked();
    await expect.element(page.getByTestId('value')).toHaveTextContent('[]');

    expect(warn).not.toHaveBeenCalled();

    group.groupState.value = 'mixed';
    await expect.poll(() => warn.mock.calls.length).toBe(1);
    warn.mockRestore();
  });
});
