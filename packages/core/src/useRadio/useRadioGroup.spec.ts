import { RadioGroupProps, useRadioGroup } from './useRadioGroup';
import { type Component, defineComponent } from 'vue';
import { RadioProps, useRadio } from './useRadio';
import { describe } from 'vitest';
import { defineStandardSchema, expectNoA11yViolations } from '@test-utils/index';
import { page } from 'vitest/browser';

const createGroup = (
  props: RadioGroupProps,
  onSetup?: (group: ReturnType<typeof useRadioGroup<string>>) => void,
): Component => {
  return defineComponent({
    setup() {
      const group = useRadioGroup(props);

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

const createRadio = (template = InputBase): Component => {
  return defineComponent({
    template,
    inheritAttrs: false,
    setup(props: RadioProps, { attrs }) {
      const radio = useRadio({ ...props, ...attrs });

      return {
        ...props,
        ...attrs,
        ...radio,
      };
    },
  });
};

describe('click behavior', () => {
  test('with input as base element', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    await page.getByLabelText('First').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('1');
    await page.getByLabelText('Second').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
  });

  test('with custom elements as base', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio(CustomBase);

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    await page.getByLabelText('First').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('1');
    await page.getByLabelText('Second').click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
  });
});

describe('Space key selects the radio', () => {
  test('with input as base element', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('1');
    (await page.getByLabelText('Second').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
  });

  test('with custom elements as base', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio(CustomBase);

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('1');
    (await page.getByLabelText('Second').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
  });

  test('disabled radio cannot be selected', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" :disabled="true" value="1" />
          <RadioInput label="Second" :disabled="true" value="2" />
        </RadioGroup>
      `,
    });

    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await page.getByLabelText('Second').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('');
  });
});

describe('Arrow keys behavior', () => {
  describe('LTR', () => {
    async function renderTest() {
      const RadioGroup = createGroup({ label: 'Group' });
      const RadioInput = createRadio();

      page.render({
        components: { RadioGroup, RadioInput },
        template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third" value="3" />
        </RadioGroup>
      `,
      });
    }

    test('arrow down moves forward', async () => {
      renderTest();

      const group = page.getByLabelText('Group');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('2');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('3');
    });

    test('arrow up moves backward', async () => {
      renderTest();

      const group = page.getByLabelText('Group');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('3');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('2');
    });

    test('arrow right moves forward', async () => {
      renderTest();

      const group = page.getByLabelText('Group');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('2');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('3');
    });

    test('arrow left moves backward', async () => {
      renderTest();

      const group = page.getByLabelText('Group');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('3');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('2');
    });
  });

  describe('RTL', () => {
    async function renderTest() {
      const RadioGroup = createGroup({ label: 'Group', dir: 'rtl' });
      const RadioInput = createRadio();

      page.render({
        components: { RadioGroup, RadioInput },
        template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third" value="3" />
        </RadioGroup>
      `,
      });
    }

    test('arrow down moves forward', async () => {
      renderTest();

      const group = page.getByLabelText('Group');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('2');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('3');
    });

    test('arrow up moves backward', async () => {
      renderTest();

      const group = page.getByLabelText('Group');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('3');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('2');
    });

    test('arrow left moves forward', async () => {
      renderTest();

      const group = page.getByLabelText('Group');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('2');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('3');
    });

    test('arrow right moves backward', async () => {
      renderTest();

      const group = page.getByLabelText('Group');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('3');
      (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
      await expect.element(page.getByTestId('value')).toHaveTextContent('2');
    });
  });

  test('skips disabled buttons', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third" :disabled="true" value="3" />
        </RadioGroup>
      `,
    });

    const group = page.getByLabelText('Group');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('1');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('1');
  });

  test('skips disabled buttons with first disabled', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" :disabled="true" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third"  value="3" />
        </RadioGroup>
      `,
    });

    const group = page.getByLabelText('Group');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('3');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
  });

  test('does not affect disabled groups', async () => {
    const RadioGroup = createGroup({ label: 'Group', disabled: true });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third"  value="3" />
        </RadioGroup>
      `,
    });

    const group = page.getByLabelText('Group');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('');
  });

  test('does not affect readonly groups', async () => {
    const RadioGroup = createGroup({ label: 'Group', readonly: true });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third"  value="3" />
        </RadioGroup>
      `,
    });

    const group = page.getByLabelText('Group');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await group.element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('');
  });
});

describe('validation', () => {
  test('should revalidate when value changes via arrow keys', async () => {
    let group!: ReturnType<typeof useRadioGroup<string>>;
    const schema = defineStandardSchema<any, any>(value => {
      return Number(value) > 2
        ? { value: String(value) }
        : { issues: [{ message: 'Value must be greater than 2', path: [] }] };
    });

    const RadioGroup = createGroup({ label: 'Group', required: true, schema }, g => {
      group = g;
    });
    const RadioInput = createRadio(CustomBase);

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third"  value="3" />
        </RadioGroup>
      `,
    });

    await page.getByLabelText('Second').click();
    await expect.poll(() => group.errorMessage.value).toBe('Value must be greater than 2');
    (await page.getByRole('radiogroup').element()).dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }),
    );
    await expect.poll(() => group.errorMessage.value).toBe('');
  });

  test('should revalidate when value changes via clicks', async () => {
    let group!: ReturnType<typeof useRadioGroup<string>>;
    const schema = defineStandardSchema<any, any>(value => {
      return Number(value) > 2
        ? { value: String(value) }
        : { issues: [{ message: 'Value must be greater than 2', path: [] }] };
    });

    const RadioGroup = createGroup({ label: 'Group', required: true, schema }, g => {
      group = g;
    });
    const RadioInput = createRadio(CustomBase);

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third"  value="3" />
        </RadioGroup>
      `,
    });

    await page.getByLabelText('First').click();
    await expect.poll(() => group.errorMessage.value).toBe('Value must be greater than 2');
    await page.getByLabelText('Third').click();
    await expect.poll(() => group.errorMessage.value).toBe('');
  });
});

describe('a11y', () => {
  test('with input as base element', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('with custom elements as base', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio(CustomBase);

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('picks up native error messages', async () => {
    const RadioGroup = createGroup({ label: 'Group', required: true });
    const RadioInput = createRadio();

    page.render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third"  value="3" />
        </RadioGroup>
      `,
    });

    (await page.getByLabelText('First').element()).dispatchEvent(new Event('invalid', { bubbles: true }));

    // The group itself isn't a native input, so validate by ARIA state.
    await expect.element(page.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true');

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});
