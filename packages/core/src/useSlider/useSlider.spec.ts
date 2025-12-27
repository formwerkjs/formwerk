import { type Component, onMounted } from 'vue';
import { SliderThumbProps, useSliderThumb } from './useSliderThumb';
import { SliderProps, useSlider } from './useSlider';
import { describe } from 'vitest';
import { page } from 'vitest/browser';
import { expectNoA11yViolations, appRender } from '@test-utils/index';

async function keyDown(target: ReturnType<typeof page.getByRole>, code: string) {
  (await target.element()).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code }));
}

async function mouseDown(
  target: ReturnType<typeof page.getByRole> | ReturnType<typeof page.getByTestId>,
  init: MouseEventInit = {},
) {
  (await target.element()).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ...init }));
}

async function mouseMove(target: ReturnType<typeof page.getByRole>, init: MouseEventInit = {}) {
  (await target.element()).dispatchEvent(new MouseEvent('mousemove', { bubbles: true, ...init }));
}

async function mouseUp(target: ReturnType<typeof page.getByRole>) {
  (await target.element()).dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

function makeTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>) {
  const e = new Event(type, { bubbles: true, cancelable: true }) as unknown as {
    touches: Array<{ clientX: number; clientY: number }>;
  };
  Object.defineProperty(e, 'touches', { value: touches });
  return e as unknown as Event;
}

async function touchStart(
  target: ReturnType<typeof page.getByRole>,
  touches: Array<{ clientX: number; clientY: number }>,
) {
  (await target.element()).dispatchEvent(makeTouchEvent('touchstart', touches));
}

async function touchMove(
  target: ReturnType<typeof page.getByRole>,
  touches: Array<{ clientX: number; clientY: number }>,
) {
  (await target.element()).dispatchEvent(makeTouchEvent('touchmove', touches));
}

async function touchEnd(target: ReturnType<typeof page.getByRole>) {
  (await target.element()).dispatchEvent(makeTouchEvent('touchend', []));
}

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

describe('thumb behavior with mouse', () => {
  const Thumb = createThumbComponent({});
  const Slider = createSliderComponent({
    label: 'Slider',
  });

  test('can be dragged to set value', async () => {
    appRender({
      components: { Thumb, Slider },
      template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
    });

    const slider = page.getByRole('slider');
    await mouseDown(slider, { clientX: 0, clientY: 0, button: 0 });
    await mouseMove(slider, { clientX: 83, clientY: 0 });
    await mouseUp(slider);

    await expect.element(slider).toHaveAttribute('aria-valuenow', '83');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('83');
  });

  test('can be dragged to set value in RTL', async () => {
    const RtlSlider = createSliderComponent({
      label: 'Slider',
      dir: 'rtl',
    });

    appRender({
      components: { Thumb, RtlSlider },
      template: `
        <RtlSlider>
          <Thumb />
        </RtlSlider>
    `,
    });

    const slider = page.getByRole('slider');
    await mouseDown(slider, { clientX: 0, clientY: 0, button: 0 });
    await mouseMove(slider, { clientX: 17, clientY: 0 });
    await mouseUp(slider);

    await expect.element(slider).toHaveAttribute('aria-valuenow', '83');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('83');
  });

  test('does not respond to right clicks', async () => {
    appRender({
      components: { Thumb, Slider },
      template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
    });

    const slider = page.getByRole('slider');
    await mouseDown(slider, { button: 1, clientX: 0, clientY: 0 });
    await mouseMove(slider, { clientX: 50, clientY: 0 });
    await mouseUp(slider);

    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
  });

  test('does not respond if slider is disabled', async () => {
    const DisabledSlider = createSliderComponent({
      label: 'Slider',
      disabled: true,
    });

    appRender({
      components: { Thumb, DisabledSlider },
      template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
    });

    const slider = page.getByRole('slider');
    await mouseDown(slider, { button: 1, clientX: 0, clientY: 0 });
    await mouseMove(slider, { clientX: 50, clientY: 0 });
    await mouseUp(slider);

    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('thumb behavior with touch', () => {
  const Thumb = createThumbComponent({});
  const Slider = createSliderComponent({
    label: 'Slider',
  });

  test('can be dragged to set value', async () => {
    appRender({
      components: { Thumb, Slider },
      template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
    });

    const slider = page.getByRole('slider');
    await touchStart(slider, [{ clientX: 0, clientY: 0 }]);
    await touchMove(slider, [{ clientX: 83, clientY: 0 }]);
    await touchEnd(slider);

    await expect.element(slider).toHaveAttribute('aria-valuenow', '83');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('83');
  });

  test('can be dragged to set value in RTL', async () => {
    const RtlSlider = createSliderComponent({
      label: 'Slider',
      dir: 'rtl',
    });

    appRender({
      components: { Thumb, RtlSlider },
      template: `
        <RtlSlider>
          <Thumb />
        </RtlSlider>
    `,
    });

    const slider = page.getByRole('slider');
    await touchStart(slider, [{ clientX: 0, clientY: 0 }]);
    await touchMove(slider, [{ clientX: 17, clientY: 0 }]);
    await touchEnd(slider);

    await expect.element(slider).toHaveAttribute('aria-valuenow', '83');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('83');
  });

  test('does not respond to multi-touch', async () => {
    appRender({
      components: { Thumb, Slider },
      template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
    });

    const slider = page.getByRole('slider');
    await touchStart(slider, [
      { clientX: 0, clientY: 0 },
      { clientX: 10, clientY: 0 },
    ]);
    await touchMove(slider, [
      { clientX: 50, clientY: 0 },
      { clientX: 60, clientY: 0 },
    ]);
    await touchEnd(slider);

    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
  });

  test('does not respond if slider is disabled', async () => {
    const DisabledSlider = createSliderComponent({
      label: 'Slider',
      disabled: true,
    });

    appRender({
      components: { Thumb, DisabledSlider },
      template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
    });

    const slider = page.getByRole('slider');
    await touchStart(slider, [{ clientX: 0, clientY: 0 }]);
    await touchMove(slider, [{ clientX: 50, clientY: 0 }]);
    await touchEnd(slider);

    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
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
      appRender({
        components: { Thumb, Slider },
        template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
      });

      const slider = page.getByRole('slider');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
      await keyDown(slider, 'ArrowRight');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('2');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '2');
      await keyDown(slider, 'ArrowLeft');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    });

    test('Increases/Decreases the value in RTL', async () => {
      appRender({
        components: { Thumb, RtlSlider },
        template: `
        <RtlSlider>
          <Thumb />
        </RtlSlider>
    `,
      });

      const slider = page.getByRole('slider');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
      await keyDown(slider, 'ArrowLeft');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('2');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '2');
      await keyDown(slider, 'ArrowRight');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    });

    test('does not respond if slider is disabled', async () => {
      const DisabledSlider = createSliderComponent({
        label: 'Slider',
        disabled: true,
      });

      appRender({
        components: { Thumb, DisabledSlider },
        template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
      });

      const slider = page.getByRole('slider');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
      await keyDown(slider, 'ArrowRight');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Up/Down Arrows', () => {
    test('Decrases/Increases the value horizontally', async () => {
      appRender({
        components: { Thumb, Slider },
        template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
      });

      const slider = page.getByRole('slider');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
      await keyDown(slider, 'ArrowUp');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('2');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '2');
      await keyDown(slider, 'ArrowDown');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    });

    test('Decreases/Increases the value vertically', async () => {
      appRender({
        components: { Thumb, VerticalSlider },
        template: `
        <VerticalSlider>
          <Thumb />
        </VerticalSlider>
    `,
      });

      const slider = page.getByRole('slider');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
      await keyDown(slider, 'ArrowUp');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('2');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '2');
      await keyDown(slider, 'ArrowDown');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    });

    test('does not respond if slider is disabled', async () => {
      const DisabledSlider = createSliderComponent({
        label: 'Slider',
        disabled: true,
      });

      appRender({
        components: { Thumb, DisabledSlider },
        template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
      });

      const slider = page.getByRole('slider');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
      await keyDown(slider, 'ArrowUp');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Page Up/Down Keys', () => {
    test('Increases/Decreases the value', async () => {
      appRender({
        components: { Thumb, Slider },
        template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
      });

      const slider = page.getByRole('slider');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
      await keyDown(slider, 'PageUp');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('100');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '100');
      await keyDown(slider, 'PageDown');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Home/End Keys', () => {
    test('Increases/Decreases the value', async () => {
      appRender({
        components: { Thumb, Slider },
        template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
      });

      const slider = page.getByRole('slider');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
      await keyDown(slider, 'Home');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('100');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '100');
      await keyDown(slider, 'End');
      await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0');
      await expect.element(slider).toHaveAttribute('aria-valuenow', '0');
    });
  });
});

describe('track behavior', () => {
  const Thumb = createThumbComponent({});
  const Slider = createSliderComponent({
    label: 'Slider',
  });

  test('clicking the track sets the thumb position and value', async () => {
    appRender({
      components: { Thumb, Slider },
      template: `
        <Slider>
          <Thumb />
        </Slider>
    `,
    });

    await mouseDown(page.getByTestId('track'), { clientX: 50, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('50');
    await expect.element(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
  });

  test('clicking the track sets the nearest thumb position for multi thumb sliders', async () => {
    const MultiSlider = createSliderComponent({
      label: 'MultiSlider',
      modelValue: [0, 50],
    });

    appRender({
      components: { Thumb, MultiSlider },
      template: `
        <MultiSlider>
          <Thumb />
          <Thumb />
        </MultiSlider>
    `,
    });

    const sliders = page.getByRole('slider');
    await mouseDown(page.getByTestId('track'), { clientX: 80, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('[ 0, 80 ]');
    await expect.element(sliders.nth(0)).toHaveAttribute('aria-valuenow', '0');
    await expect.element(sliders.nth(1)).toHaveAttribute('aria-valuenow', '80');
    await mouseDown(page.getByTestId('track'), { clientX: 10, clientY: 1, button: 0 });
    await expect.element(sliders.nth(0)).toHaveAttribute('aria-valuenow', '10');
    await expect.element(sliders.nth(1)).toHaveAttribute('aria-valuenow', '80');
  });

  test('does not respond if slider is disabled', async () => {
    const DisabledSlider = createSliderComponent({
      label: 'Slider',
      disabled: true,
    });

    appRender({
      components: { Thumb, DisabledSlider },
      template: `
        <DisabledSlider>
          <Thumb />
        </DisabledSlider>
    `,
    });

    await mouseDown(page.getByTestId('track'), { clientX: 50, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('');
    await expect.element(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('decimal steps', () => {
  const Thumb = createThumbComponent({});

  test('handles decimal step increments correctly', async () => {
    const DecimalSlider = createSliderComponent({
      label: 'Slider',
      min: 0,
      max: 1,
      step: 0.1,
      modelValue: 0,
    });

    appRender({
      components: { Thumb, DecimalSlider },
      template: `
        <DecimalSlider>
          <Thumb />
        </DecimalSlider>
      `,
    });

    const slider = page.getByRole('slider');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0');

    await keyDown(slider, 'ArrowUp');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0.1');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0.1');

    await keyDown(slider, 'ArrowUp');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0.2');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0.2');

    await keyDown(slider, 'ArrowDown');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0.1');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0.1');
  });

  test('handles step 1.5 increments correctly', async () => {
    const DecimalSlider = createSliderComponent({
      label: 'Slider',
      min: 0,
      max: 10,
      step: 1.5,
      modelValue: 0,
    });

    appRender({
      components: { Thumb, DecimalSlider },
      template: `
        <DecimalSlider>
          <Thumb />
        </DecimalSlider>
      `,
    });

    const slider = page.getByRole('slider');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('0');

    await keyDown(slider, 'ArrowUp');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('1.5');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '1.5');

    await keyDown(slider, 'ArrowUp');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('3');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '3');
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

    appRender({
      components: { Thumb, DiscreteSlider },
      template: `
        <DiscreteSlider>
          <Thumb />
        </DiscreteSlider>
      `,
    });

    const slider = page.getByRole('slider');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('low');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '0');

    await mouseDown(page.getByTestId('track'), { clientX: 50, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('medium');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '1');

    await mouseDown(page.getByTestId('track'), { clientX: 90, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('high');
    await expect.element(slider).toHaveAttribute('aria-valuenow', '2');
  });

  test('works with multiple thumbs', async () => {
    const DiscreteMultiSlider = createSliderComponent({
      label: 'MultiSlider',
      options: ['low', 'medium', 'high'],
      modelValue: ['low', 'high'],
    });

    appRender({
      components: { Thumb, DiscreteMultiSlider },
      template: `
        <DiscreteMultiSlider>
          <Thumb />
          <Thumb />
        </DiscreteMultiSlider>
      `,
    });

    const sliders = page.getByRole('slider');
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('[ "low", "high" ]');
    await expect.element(sliders.nth(0)).toHaveAttribute('aria-valuenow', '0');
    await expect.element(sliders.nth(1)).toHaveAttribute('aria-valuenow', '2');

    await mouseDown(page.getByTestId('track'), { clientX: 50, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('[ "medium", "high" ]');
    await expect.element(sliders.nth(0)).toHaveAttribute('aria-valuenow', '1');
    await expect.element(sliders.nth(1)).toHaveAttribute('aria-valuenow', '2');

    await mouseDown(page.getByTestId('track'), { clientX: 20, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('[ "low", "high" ]');
    await expect.element(sliders.nth(0)).toHaveAttribute('aria-valuenow', '0');
    await expect.element(sliders.nth(1)).toHaveAttribute('aria-valuenow', '2');
  });

  test('value text shows option value by default', async () => {
    const Thumb = createThumbComponent({});

    const DiscreteSlider = createSliderComponent({
      label: 'Slider',
      options: ['low', 'medium', 'high'],
      modelValue: 'low',
    });

    appRender({
      components: { Thumb, DiscreteSlider },
      template: `
        <DiscreteSlider>
          <Thumb />
        </DiscreteSlider>
    `,
    });

    await mouseDown(page.getByTestId('track'), { clientX: 80, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('high');
    await expect.element(page.getByRole('slider')).toHaveAttribute('aria-valuetext', 'high');
  });

  test('value text shows formatted value if provided', async () => {
    const Thumb = createThumbComponent({
      formatValue: value => `Priority ${value}`,
    });

    const DiscreteSlider = createSliderComponent({
      label: 'Slider',
      options: ['low', 'medium', 'high'],
      modelValue: 'low',
    });

    appRender({
      components: { Thumb, DiscreteSlider },
      template: `
        <DiscreteSlider>
          <Thumb />
        </DiscreteSlider>
    `,
    });

    await mouseDown(page.getByTestId('track'), { clientX: 80, clientY: 1, button: 0 });
    await expect.element(page.getByTestId('slider-value')).toHaveTextContent('high');
    await expect.element(page.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Priority high');
  });
});

describe('a11y', () => {
  const Thumb = createThumbComponent({});
  const Slider = createSliderComponent({
    label: 'Slider',
  });

  test('with single thumb set up', async () => {
    appRender({
      components: { Thumb, Slider },
      template: `
        <div data-testid="fixture">
          <Slider>
            <Thumb />
          </Slider>
        </div>
      `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('with multiple thumb set up', async () => {
    appRender({
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

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});
