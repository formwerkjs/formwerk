import { RadioGroupProps, useRadioGroup } from './useRadioGroup';
import { type Component, defineComponent } from 'vue';
import { RadioProps, useRadio } from './useRadio';
import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { describe } from 'vitest';
import { flush } from '@test-utils/flush';

const createGroup = (props: RadioGroupProps): Component => {
  return defineComponent({
    setup() {
      const group = useRadioGroup(props);

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
    <div v-bind="inputProps"></div>
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

describe('has no a11y violations', () => {
  test('with input as base element', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('with custom elements as base', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio(CustomBase);

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

describe('click behavior', () => {
  test('with input as base element', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    await fireEvent.click(screen.getByLabelText('Second'));
    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });

  test('with custom elements as base', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio(CustomBase);

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    await fireEvent.click(screen.getByLabelText('Second'));
    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });
});

describe('Space key selects the radio', () => {
  test('with input as base element', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    await fireEvent.keyDown(screen.getByLabelText('First'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    await fireEvent.click(screen.getByLabelText('Second'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });

  test('with custom elements as base', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio(CustomBase);

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
        </RadioGroup>
      `,
    });

    await fireEvent.keyDown(screen.getByLabelText('First'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    await fireEvent.click(screen.getByLabelText('Second'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });

  test('disabled radio cannot be selected', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" :disabled="true" value="1" />
          <RadioInput label="Second" :disabled="true" value="2" />
        </RadioGroup>
      `,
    });

    await fireEvent.keyDown(screen.getByLabelText('First'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('');
    await fireEvent.click(screen.getByLabelText('Second'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('');
  });
});

describe('Arrow keys behavior', () => {
  describe('LTR', () => {
    async function renderTest() {
      const RadioGroup = createGroup({ label: 'Group' });
      const RadioInput = createRadio();

      await render({
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
      await renderTest();

      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
      expect(screen.getByTestId('value')).toHaveTextContent('3');
    });

    test('arrow up moves backward', async () => {
      await renderTest();

      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowUp' });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowUp' });
      expect(screen.getByTestId('value')).toHaveTextContent('3');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowUp' });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
    });

    test('arrow right moves forward', async () => {
      await renderTest();

      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowRight' });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowRight' });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowRight' });
      expect(screen.getByTestId('value')).toHaveTextContent('3');
    });

    test('arrow left moves backward', async () => {
      await renderTest();

      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowLeft' });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowLeft' });
      expect(screen.getByTestId('value')).toHaveTextContent('3');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowLeft' });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
    });
  });

  describe('RTL', () => {
    async function renderTest() {
      const RadioGroup = createGroup({ label: 'Group', dir: 'rtl' });
      const RadioInput = createRadio();

      await render({
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
      await renderTest();

      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
      expect(screen.getByTestId('value')).toHaveTextContent('3');
    });

    test('arrow up moves backward', async () => {
      await renderTest();

      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowUp' });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowUp' });
      expect(screen.getByTestId('value')).toHaveTextContent('3');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowUp' });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
    });

    test('arrow left moves forward', async () => {
      await renderTest();

      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowLeft' });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowLeft' });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowLeft' });
      expect(screen.getByTestId('value')).toHaveTextContent('3');
    });

    test('arrow right moves backward', async () => {
      await renderTest();

      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowRight' });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowRight' });
      expect(screen.getByTestId('value')).toHaveTextContent('3');
      await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowRight' });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
    });
  });

  test('skips disabled buttons', async () => {
    const RadioGroup = createGroup({ label: 'Group' });
    const RadioInput = createRadio();

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third" :disabled="true" value="3" />
        </RadioGroup>
      `,
    });

    await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
    expect(screen.getByTestId('value')).toHaveTextContent('2');
    await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
    expect(screen.getByTestId('value')).toHaveTextContent('1');
  });

  test('does not affect disabled groups', async () => {
    const RadioGroup = createGroup({ label: 'Group', disabled: true });
    const RadioInput = createRadio();

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third"  value="3" />
        </RadioGroup>
      `,
    });

    await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
    expect(screen.getByTestId('value')).toHaveTextContent('');
    await fireEvent.keyDown(screen.getByLabelText('Group'), { code: 'ArrowDown' });
    expect(screen.getByTestId('value')).toHaveTextContent('');
  });
});

describe('validation', () => {
  test('picks up native error messages', async () => {
    const RadioGroup = createGroup({ label: 'Group', required: true });
    const RadioInput = createRadio();

    await render({
      components: { RadioGroup, RadioInput },
      template: `
        <RadioGroup data-testid="fixture">
          <RadioInput label="First" value="1" />
          <RadioInput label="Second" value="2" />
          <RadioInput label="Third"  value="3" />
        </RadioGroup>
      `,
    });

    await fireEvent.invalid(screen.getByLabelText('First'));
    await flush();
    expect(screen.getByLabelText('Group')).toHaveErrorMessage('Constraints not satisfied');

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});
