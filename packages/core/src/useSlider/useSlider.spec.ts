import { type Component, onMounted } from 'vue';
import { SliderThumbProps, useSliderThumb } from './useSliderThumb';
import { SliderProps, useSlider } from './useSlider';
import { fireEvent, render, screen } from '@testing-library/vue';
import { flush } from '@test-utils/flush';
import { axe } from 'vitest-axe';
import { describe } from 'vitest';

function createThumbComponent(props: SliderThumbProps): Component {
  return {
    setup() {
      const { thumbProps, currentValue } = useSliderThumb(props);

      return {
        thumbProps,
        currentValue,
        ...props,
      };
    },
    template: `<div data-testid="thumb" v-bind="thumbProps" style="width: 2px;height: 2px;overflow: hidden;">{{ currentValue }}</div>`,
  };
}

function createSliderComponent<TValue>(props: SliderProps<TValue>): Component {
  return {
    setup() {
      const { fieldValue, labelProps, trackProps, groupProps, outputProps, trackEl } = useSlider(props);

      onMounted(() => setUpRect(trackEl.value));

      return {
        fieldValue,
        labelProps,
        trackProps,
        groupProps,
        outputProps,
        ...props,
      };
    },
    template: `<div v-bind="groupProps">
      <span v-bind="labelProps">{{ label }}</span>
      <div data-testid="track" v-bind="trackProps" :style="{ 'width': '100px' }">
        <slot />
      </div>

      <span v-bind="outputProps" data-testid="slider-value">{{ fieldValue }}</span>
    </div>
    `,
  };
}

function setUpRect(el: HTMLElement | undefined) {
  if (!el) {
    return;
  }

  el.getBoundingClientRect = vi.fn(() => ({
    x: 0,
    y: 0,
    width: 100,
    height: 1,
    top: 0,
    right: 100,
    bottom: 1,
    left: 0,
    toJSON: () => {},
  }));
}

describe('should not have a11y errors', () => {
  const Thumb = createThumbComponent({});
  const Slider = createSliderComponent({
    label: 'Slider',
  });

  test('with single thumb set up', async () => {
    await render({
      components: { Thumb, Slider },
      template: `
      <div data-testid="fixture">
        <Slider>
          <Thumb />
        </Slider>
      </div>
    `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('with multiple thumb set up', async () => {
    await render({
      components: { Thumb, Slider },
      template: `
      <div data-testid="fixture">
        <Slider>
          <Thumb />
          <Thumb />
        </Slider>
      </div>
    `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

describe('thumb behavior', () => {
  const Thumb = createThumbComponent({});
  const Slider = createSliderComponent({
    label: 'Slider',
  });

  test('can be dragged to set value', async () => {
    await render({
      components: { Thumb, Slider },
      template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
    });

    await fireEvent.mouseDown(screen.getByRole('slider'), { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(screen.getByRole('slider'), { clientX: 83, clientY: 0 });
    await fireEvent.mouseUp(screen.getByRole('slider'));

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '83');
    expect(screen.getByTestId('slider-value')).toHaveTextContent('83');
  });

  test('can be dragged to set value in RTL', async () => {
    const RtlSlider = createSliderComponent({
      label: 'Slider',
      dir: 'rtl',
    });

    await render({
      components: { Thumb, RtlSlider },
      template: `
        <RtlSlider>
          <Thumb />
        </RtlSlider>
    `,
    });

    await fireEvent.mouseDown(screen.getByRole('slider'), { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(screen.getByRole('slider'), { clientX: 17, clientY: 0 });
    await fireEvent.mouseUp(screen.getByRole('slider'));

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '83');
    expect(screen.getByTestId('slider-value')).toHaveTextContent('83');
  });

  test('does not respond to right clicks', async () => {
    await render({
      components: { Thumb, Slider },
      template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
    });

    await fireEvent.mouseDown(screen.getByRole('slider'), { button: 1, clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(screen.getByRole('slider'), { clientX: 50, clientY: 0 });
    await fireEvent.mouseUp(screen.getByRole('slider'));

    expect(screen.getByTestId('slider-value')).toHaveTextContent('');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
  });

  test('does not respond if slider is disabled', async () => {
    const DisabledSlider = createSliderComponent({
      label: 'Slider',
      disabled: true,
    });

    await render({
      components: { Thumb, DisabledSlider },
      template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
    });

    await fireEvent.mouseDown(screen.getByRole('slider'), { button: 1, clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(screen.getByRole('slider'), { clientX: 50, clientY: 0 });
    await fireEvent.mouseUp(screen.getByRole('slider'));

    expect(screen.getByTestId('slider-value')).toHaveTextContent('');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('keyboard behavior', () => {
  const Thumb = createThumbComponent({});
  const Slider = createSliderComponent({
    label: 'Slider',
    step: 2,
  });
  const RtlSlider = createSliderComponent({
    label: 'Slider',
    dir: 'rtl',
    step: 2,
  });
  const VerticalSlider = createSliderComponent({
    label: 'Slider',
    orientation: 'vertical',
    step: 2,
  });

  describe('Left/Right Arrows', () => {
    test('Decrases/Increases the value in LTR', async () => {
      await render({
        components: { Thumb, Slider },
        template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
      });

      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowRight' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('2');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowLeft' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('0');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });

    test('Increases/Decreases the value in RTL', async () => {
      await render({
        components: { Thumb, RtlSlider },
        template: `
        <RtlSlider>
          <Thumb />
        </RtlSlider>
    `,
      });

      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowLeft' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('2');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowRight' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('0');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });

    test('does not respond if slider is disabled', async () => {
      const DisabledSlider = createSliderComponent({
        label: 'Slider',
        disabled: true,
      });

      await render({
        components: { Thumb, DisabledSlider },
        template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
      });

      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowRight' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Up/Down Arrows', () => {
    test('Decrases/Increases the value horizontally', async () => {
      await render({
        components: { Thumb, Slider },
        template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
      });

      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowUp' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('2');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowDown' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('0');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });

    test('Decreases/Increases the value vertically', async () => {
      await render({
        components: { Thumb, VerticalSlider },
        template: `
        <VerticalSlider>
          <Thumb />
        </VerticalSlider>
    `,
      });

      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowUp' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('2');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowDown' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('0');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });

    test('does not respond if slider is disabled', async () => {
      const DisabledSlider = createSliderComponent({
        label: 'Slider',
        disabled: true,
      });

      await render({
        components: { Thumb, DisabledSlider },
        template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
      });

      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'ArrowUp' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Page Up/Down Keys', () => {
    test('Increases/Decreases the value', async () => {
      await render({
        components: { Thumb, Slider },
        template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
      });

      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'PageUp' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('100');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '100');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'PageDown' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('0');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Home/End Keys', () => {
    test('Increases/Decreases the value', async () => {
      await render({
        components: { Thumb, Slider },
        template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
      });

      expect(screen.getByTestId('slider-value')).toHaveTextContent('');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'Home' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('100');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '100');
      await fireEvent.keyDown(screen.getByRole('slider'), { code: 'End' });
      expect(screen.getByTestId('slider-value')).toHaveTextContent('0');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });
  });
});

describe('track behavior', () => {
  const Thumb = createThumbComponent({});
  const Slider = createSliderComponent({
    label: 'Slider',
  });

  test('clicking the track sets the thumb position and value', async () => {
    await render({
      components: { Thumb, Slider },
      template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
    });

    await fireEvent.mouseDown(screen.getByTestId('track'), { clientX: 50, clientY: 1 });
    expect(screen.getByTestId('slider-value')).toHaveTextContent('50');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
  });

  test('clicking the track sets the nearest thumb position for multi thumb sliders', async () => {
    const MultiSlider = createSliderComponent({
      label: 'MultiSlider',
      modelValue: [0, 50],
    });

    await render({
      components: { Thumb, MultiSlider },
      template: `
        <MultiSlider>
          <Thumb />
          <Thumb />
        </MultiSlider>
    `,
    });

    await fireEvent.mouseDown(screen.getByTestId('track'), { clientX: 80, clientY: 1 });
    expect(screen.getByTestId('slider-value')).toHaveTextContent('[ 0, 80 ]');
    const sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '0');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '80');
    await fireEvent.mouseDown(screen.getByTestId('track'), { clientX: 10, clientY: 1 });
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '10');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '80');
  });

  test('does not respond if slider is disabled', async () => {
    const DisabledSlider = createSliderComponent({
      label: 'Slider',
      disabled: true,
    });

    await render({
      components: { Thumb, DisabledSlider },
      template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
    });

    await fireEvent.mouseDown(screen.getByTestId('track'), { clientX: 50, clientY: 1 });
    expect(screen.getByTestId('slider-value')).toHaveTextContent('');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('discrete steps', () => {
  const Thumb = createThumbComponent({});

  test('maps values to provided options', async () => {
    const DiscreteSlider = createSliderComponent({
      label: 'Slider',
      options: ['low', 'medium', 'high'],
      modelValue: 'low',
    });

    await render({
      components: { Thumb, DiscreteSlider },
      template: `
        <DiscreteSlider>
          <Thumb />
        </DiscreteSlider>
      `,
    });

    expect(screen.getByTestId('slider-value')).toHaveTextContent('low');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');

    await fireEvent.mouseDown(screen.getByTestId('track'), { clientX: 50, clientY: 1 });
    expect(screen.getByTestId('slider-value')).toHaveTextContent('medium');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '1');

    await fireEvent.mouseDown(screen.getByTestId('track'), { clientX: 90, clientY: 1 });
    expect(screen.getByTestId('slider-value')).toHaveTextContent('high');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');
  });

  test('works with multiple thumbs', async () => {
    const DiscreteMultiSlider = createSliderComponent({
      label: 'MultiSlider',
      options: ['low', 'medium', 'high'],
      modelValue: ['low', 'high'],
    });

    await render({
      components: { Thumb, DiscreteMultiSlider },
      template: `
        <DiscreteMultiSlider>
          <Thumb />
          <Thumb />
        </DiscreteMultiSlider>
      `,
    });

    expect(screen.getByTestId('slider-value')).toHaveTextContent('[ "low", "high" ]');
    const sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '0');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '2');

    await fireEvent.mouseDown(screen.getByTestId('track'), { clientX: 50, clientY: 1 });
    expect(screen.getByTestId('slider-value')).toHaveTextContent('[ "medium", "high" ]');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '1');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '2');

    await fireEvent.mouseDown(screen.getByTestId('track'), { clientX: 20, clientY: 1 });
    expect(screen.getByTestId('slider-value')).toHaveTextContent('[ "low", "high" ]');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '0');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '2');
  });
});
