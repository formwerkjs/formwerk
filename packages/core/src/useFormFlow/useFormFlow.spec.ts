import { defineComponent } from 'vue';
import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useFormFlow, FormFlowSegment } from '.';
import { flush } from '@test-utils/flush';
import { useTextField } from '../useTextField';

// Simple TextField component for tests
const TextField = defineComponent({
  props: {
    label: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const { inputProps, labelProps, fieldValue } = useTextField({
      name: () => props.name,
      label: props.label,
    });

    return {
      inputProps,
      labelProps,
      fieldValue,
    };
  },
  template: `
    <div class="field-wrapper">
      <label v-bind="labelProps">{{ label }}</label>
      <input
        v-bind="inputProps"
      />

      {{ fieldValue }}
    </div>
  `,
});

// Helper components for testing the form flow
const SteppedFormFlow = defineComponent({
  components: { FormFlowSegment, TextField },
  props: {
    initialValues: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['done'],
  setup(props, { emit }) {
    const {
      formProps,
      formElement,
      values,
      nextButtonProps,
      previousButtonProps,
      currentSegment,
      isLastSegment,

      onDone,
    } = useFormFlow({
      initialValues: props.initialValues,
    });

    onDone(values => emit('done', values.toObject()));

    return {
      formProps,
      formElement,
      values,
      nextButtonProps,
      previousButtonProps,
      currentSegment,
      isLastSegment,
    };
  },
  template: `
    <div data-testid="flow-wrapper">
      <form
        v-bind="formProps"
        ref="formElement"
        data-testid="form-flow"
      >
        <!-- Render slots (segments) -->
        <slot></slot>

        <!-- Navigation controls -->
        <div data-testid="flow-controls">
          <button
            v-bind="previousButtonProps"
            data-testid="previous-button"
          >
            Previous
          </button>

          <button
            v-bind="nextButtonProps"
            data-testid="next-button"
          >
            {{ isLastSegment ? 'Submit' : 'Next' }}
          </button>
        </div>

        <!-- Debug info -->
        <div data-testid="current-segment">Current: {{ currentSegment }}</div>
        <pre data-testid="form-values">{{ JSON.stringify(values) }}</pre>
      </form>
    </div>
  `,
});

const TabbedFormFlow = defineComponent({
  components: { FormFlowSegment, TextField },
  props: {
    initialValues: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const {
      formProps,
      formElement,
      values,
      nextButtonProps,
      previousButtonProps,
      currentSegment,
      isLastSegment,
      goTo,
    } = useFormFlow({
      initialValues: props.initialValues,
    });

    return {
      formProps,
      formElement,
      values,
      nextButtonProps,
      previousButtonProps,
      currentSegment,
      isLastSegment,
      goTo,
    };
  },
  template: `
    <div data-testid="flow-wrapper">
      <form
        v-bind="formProps"
        ref="formElement"
        data-testid="form-flow"
      >
        <!-- Tab navigation -->
        <div data-testid="tabs">
          <button
            data-testid="tab-1"
            @click="goTo('tab-1')"
            type="button"
            :class="{ active: currentSegment === 'tab-1' }"
          >
            Personal Info
          </button>
          <button
            data-testid="tab-2"
            @click="goTo('tab-2')"
            type="button"
            :class="{ active: currentSegment === 'tab-2' }"
          >
            Address
          </button>
          <button
            data-testid="tab-3"
            @click="goTo('tab-3')"
            type="button"
            :class="{ active: currentSegment === 'tab-3' }"
          >
            Review
          </button>
        </div>

        <!-- Render slots (segments) -->
        <slot></slot>

        <!-- Navigation controls -->
        <div data-testid="flow-controls">
          <button
            v-bind="previousButtonProps"
            data-testid="previous-button"
          >
            Previous
          </button>

          <button
            v-bind="nextButtonProps"
            data-testid="next-button"
          >
            {{ isLastSegment ? 'Submit' : 'Next' }}
          </button>
        </div>

        <!-- Debug info -->
        <div data-testid="current-segment">Current: {{ currentSegment }}</div>
        <pre data-testid="form-values">{{ JSON.stringify(values) }}</pre>
      </form>
    </div>
  `,
});

describe('stepped form', () => {
  test('stepped form should not have a11y violations', async () => {
    await render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow data-testid="fixture">
            <FormFlowSegment>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('should navigate between steps with next and previous buttons and maintain field values', async () => {
    await render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow>
            <FormFlowSegment>
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>

            <FormFlowSegment>
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    await flush();

    // Should start at the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByTestId('previous-button')).toHaveAttribute('disabled');
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');

    // Go to the next step
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Should now be on the second step
    expect(screen.getByText('Step 2')).toBeVisible();
    expect(screen.getByTestId('previous-button')).not.toHaveAttribute('disabled');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeVisible();

    // Fill in the address field
    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');

    // Go back to the first step
    await fireEvent.click(screen.getByTestId('previous-button'));
    await flush();

    // Should be back on the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByTestId('previous-button')).toHaveAttribute('disabled');
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();

    // Check the form values are preserved
    expect(screen.getByLabelText('Name')).toHaveValue('John Doe');

    // Go to the next step
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Check the form values are preserved
    expect(screen.getByLabelText('Address')).toHaveValue('123 Main St');
  });

  test('should call onDone with all values when submitting the last step', async () => {
    const onDoneMock = vi.fn();
    await render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow @done="onDone">
            <FormFlowSegment>
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment>
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
      setup() {
        return {
          onDone: (result: { name: string; address: string }) => {
            onDoneMock(result);
          },
        };
      },
    });

    await flush();

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');

    // Go to the next step
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Fill in the address field
    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');

    // Submit the form
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    expect(onDoneMock).toHaveBeenCalledTimes(1);

    // Verify onDone was called
    expect(onDoneMock).toHaveBeenCalledWith({
      name: 'John Doe',
      address: '123 Main St',
    });
  });

  describe('button accessibility', () => {
    test('next and previous buttons should have proper attributes', async () => {
      await render({
        components: {
          SteppedFormFlow,
          FormFlowSegment,
        },
        template: `
          <SteppedFormFlow>
            <FormFlowSegment>
              <div>Step 1 Content</div>
            </FormFlowSegment>
            <FormFlowSegment>
              <div>Step 2 Content</div>
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
      });

      await flush();

      // Check that buttons have accessible attributes
      const nextButton = screen.getByTestId('next-button');
      const prevButton = screen.getByTestId('previous-button');

      // Next button should have type="submit" for form submission
      expect(nextButton).toHaveAttribute('type', 'submit');

      // Prev button should be disabled on the first step
      expect(prevButton).toHaveAttribute('disabled');
      expect(prevButton).toHaveAttribute('tabindex', '0');

      // Go to next step
      await fireEvent.click(nextButton);
      await flush();

      // Prev button should now be enabled
      expect(screen.getByTestId('previous-button')).not.toHaveAttribute('disabled');
    });

    test('next button should show Submit text on last step', async () => {
      await render({
        components: {
          SteppedFormFlow,
          FormFlowSegment,
        },
        template: `
          <SteppedFormFlow>
            <FormFlowSegment>
              <div>Step 1 Content</div>
            </FormFlowSegment>
            <FormFlowSegment>
              <div>Step 2 Content</div>
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
      });

      await flush();

      // Next button should say "Next" on first step
      expect(screen.getByTestId('next-button')).toHaveTextContent('Next');

      // Go to next step
      await fireEvent.click(screen.getByTestId('next-button'));
      await flush();

      // Next button should say "Submit" on last step
      expect(screen.getByTestId('next-button')).toHaveTextContent('Submit');
    });
  });
});

describe('tabbed form', () => {
  test('tabbed form should not have a11y violations', async () => {
    await render({
      components: {
        TabbedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <TabbedFormFlow data-testid="fixture">
            <FormFlowSegment id="1">
              <div class="tab-1">
                <TextField
                  label="Name"
                  name="name"
                  testId="name-input"
                  description="Enter your full name"
                />
              </div>
            </FormFlowSegment>
            <FormFlowSegment id="2">
              <div class="tab-2">
                <TextField
                  label="Address"
                  name="address"
                  testId="address-input"
                  description="Enter your mailing address"
                />
              </div>
            </FormFlowSegment>
          </TabbedFormFlow>
        `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('should navigate directly to any tab and preserve field values', async () => {
    await render({
      components: {
        TabbedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <TabbedFormFlow>
            <FormFlowSegment id="tab-1">
              <span>Tab 1</span>
              <TextField
                label="Name"
                name="name"
                />
            </FormFlowSegment>

            <FormFlowSegment id="tab-2">
              <span>Tab 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>

            <FormFlowSegment id="tab-3">
              <span>Tab 3</span>
              <div data-testid="review-content">Review your information</div>
            </FormFlowSegment>
          </TabbedFormFlow>
        `,
    });

    await flush();

    // Should start at the first tab
    expect(screen.getByTestId('current-segment').textContent).toContain('tab-1');
    expect(screen.getByLabelText('Name')).toBeVisible();

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');

    // Go directly to the third tab
    await fireEvent.click(screen.getByTestId('tab-3'));
    await flush();

    // Should be on the third tab
    expect(screen.getByTestId('current-segment').textContent).toContain('tab-3');
    expect(screen.getByText('Review your information')).toBeVisible();

    // Go to the second tab
    await fireEvent.click(screen.getByTestId('tab-2'));
    await flush();

    // Should be on the second tab
    expect(screen.getByTestId('current-segment').textContent).toContain('tab-2');
    expect(screen.getByLabelText('Address')).toBeVisible();

    // Fill in the address field
    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');

    // Go back to the first tab
    await fireEvent.click(screen.getByTestId('tab-1'));
    await flush();

    // Check the form values are preserved
    expect(screen.getByLabelText('Name')).toHaveValue('John Doe');

    // Go to the second tab
    await fireEvent.click(screen.getByTestId('tab-2'));
    await flush();

    // Check the form values are preserved
    expect(screen.getByLabelText('Address')).toHaveValue('123 Main St');
  });
});
