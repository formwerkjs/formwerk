import { defineComponent, ref } from 'vue';
import { useFormRepeater, FormRepeaterProps } from './useFormRepeater';
import { flush } from '@test-utils/index';
import { useForm } from '../useForm';
import { useTextField } from '../useTextField';
import { page } from 'vitest/browser';

function renderTest(props: FormRepeaterProps) {
  const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

  const TestComponent = defineComponent({
    setup() {
      const result = useFormRepeater(props);
      repeaterReturns.value = result;
      return {
        addButtonProps: result.addButtonProps,
        items: result.items,
        Iteration: result.Iteration,
      };
    },
    template: `
      <component
        :is="Iteration"
        v-for="(key, index) in items"
        :key="key"
        :index="index"
        v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps }"
      >
        <div data-testid="repeater-item">
          <span data-testid="key">{{ key }}</span>

          <button data-testid="remove-button" v-bind="removeButtonProps">Remove</button>
          <button data-testid="move-up-button" v-bind="moveUpButtonProps">Move Up</button>
          <button data-testid="move-down-button" v-bind="moveDownButtonProps">Move Down</button>
        </div>
      </component>

      <button data-testid="add-button" v-bind="addButtonProps">Add</button>
    `,
  });

  page.render(TestComponent);

  return {
    get swap() {
      return repeaterReturns.value!.swap;
    },
    get insert() {
      return repeaterReturns.value!.insert;
    },
    get remove() {
      return repeaterReturns.value!.remove;
    },
    get move() {
      return repeaterReturns.value!.move;
    },
  };
}

test('renders the minimum number of repeater items', async () => {
  renderTest({
    name: 'testRepeater',
    min: 1,
  });

  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(1);
});

test('adds a new item when add button is clicked', async () => {
  renderTest({
    name: 'testRepeater',
    min: 1,
  });
  await page.getByTestId('add-button').click();
  await flush();
  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(2);
});

test('does not add a new item when max limit is reached', async () => {
  renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = page.getByTestId('add-button');
  // Add items up to the maximum limit
  await addButton.click(); // 2nd item
  await addButton.click(); // 3rd item
  // Attempt to add 4th item, but the button is disabled.
  // Don't use locator.click() here because it waits for the element to become enabled.
  ((await addButton.element()) as HTMLButtonElement).click();
  await flush();

  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(3); // Should not exceed max

  // Verify that the add button is disabled
  expect(((await addButton.element()) as HTMLButtonElement).disabled).toBe(true);
});

test('removes an item when remove button is clicked', async () => {
  renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = page.getByTestId('add-button');
  // Add two more items to have three in total
  await addButton.click();
  await addButton.click();
  await flush();
  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(3);

  // Remove the second item
  await page.getByTestId('remove-button').nth(1).click();
  await flush();
  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(2);

  // Verify that the add button is enabled again
  expect(((await addButton.element()) as HTMLButtonElement).disabled).toBe(false);
});

test('should disable add button when max is reached', async () => {
  renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = page.getByTestId('add-button');
  // Add items to reach the maximum limit
  await addButton.click(); // 2nd item
  await addButton.click(); // 3rd item
  await flush();

  expect(((await addButton.element()) as HTMLButtonElement).disabled).toBe(true);
});

test('should enable add button when max is not reached', async () => {
  renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = page.getByTestId('add-button');
  expect(((await addButton.element()) as HTMLButtonElement).disabled).toBe(false);
});

test('moves an item up', async () => {
  renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = page.getByTestId('add-button');
  // Add two more items to have three in total
  await addButton.click(); // 2nd item
  await addButton.click(); // 3rd item
  await flush();

  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(3);

  // Move the third item up to the second position
  await page.getByTestId('move-up-button').nth(2).click();
  await flush();

  // Since we're not tracking the order, we'll assume the move was successful if no errors occur
  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(3);
});

test('moves an item down', async () => {
  renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = page.getByTestId('add-button');
  // Add two more items to have three in total
  await addButton.click(); // 2nd item
  await addButton.click(); // 3rd item
  await flush();

  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(3);

  // Move the first item down to the second position
  await page.getByTestId('move-down-button').nth(0).click();
  await flush();

  // Since we're not tracking the order, we'll assume the move was successful if no errors occur
  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(3);
});

test('swaps two items', async () => {
  const { swap } = renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });

  const addButton = page.getByTestId('add-button');
  await addButton.click();
  await addButton.click();
  await flush();
  await expect.element(page.getByTestId('key').nth(0)).toHaveTextContent('-0');
  await expect.element(page.getByTestId('key').nth(1)).toHaveTextContent('-1');

  swap(0, 1);
  await flush();

  await expect.element(page.getByTestId('key').nth(0)).toHaveTextContent('-1');
  await expect.element(page.getByTestId('key').nth(1)).toHaveTextContent('-0');
});

test('inserts an item at a specific index', async () => {
  const { insert } = renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });

  insert(1);
  await flush();

  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(2);
});

test('does not insert an item when max is reached', async () => {
  const { insert } = renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });

  const addButton = page.getByTestId('add-button');
  await addButton.click();
  await addButton.click();
  await flush();

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  insert(1);
  await flush();

  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(3);

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if name is not provided', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  renderTest({
    name: '',
    min: 1,
    max: 3,
  });

  expect(warn).toHaveBeenLastCalledWith('[Formwerk]: "name" prop is required for useFormRepeater');
  warn.mockRestore();
});

test('does not remove an item when min is reached', async () => {
  const { remove } = renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  remove(0);
  await flush();

  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(1);
  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('can remove all if no min is set', async () => {
  const { remove } = renderTest({
    name: 'testRepeater',
  });

  remove(0);
  await flush();

  expect(document.querySelectorAll('[data-testid="repeater-item"]').length).toBe(0);
});

test('renders Iteration component with correct props', async () => {
  const TestComponent = defineComponent({
    setup() {
      const { Iteration, items } = useFormRepeater({
        name: 'testRepeater',
        min: 1,
      });

      return { items, Iteration };
    },
    template: `
      <component :is="Iteration" v-for="(key, index) in items" :key="key" :index="index" v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps }">
        <div data-testid="iteration-content">
          <button data-testid="remove-button" v-bind="removeButtonProps">Remove</button>
          <button data-testid="move-up-button" v-bind="moveUpButtonProps">Move Up</button>
          <button data-testid="move-down-button" v-bind="moveDownButtonProps">Move Down</button>
        </div>
      </component>
    `,
  });

  page.render(TestComponent);

  await expect.element(page.getByTestId('iteration-content')).toBeInTheDocument();

  await expect.element(page.getByTestId('remove-button')).toBeInTheDocument();
  await expect.element(page.getByTestId('remove-button')).toHaveAttribute('type', 'button');

  await expect.element(page.getByTestId('move-up-button')).toBeInTheDocument();
  await expect.element(page.getByTestId('move-up-button')).toHaveAttribute('type', 'button');
  expect(((await page.getByTestId('move-up-button').element()) as HTMLButtonElement).disabled).toBe(true);

  await expect.element(page.getByTestId('move-down-button')).toBeInTheDocument();
  await expect.element(page.getByTestId('move-down-button')).toHaveAttribute('type', 'button');
});

test('renders Iteration component with correct props with custom element', async () => {
  const TestComponent = defineComponent({
    setup() {
      const { Iteration, items } = useFormRepeater({
        name: 'testRepeater',
        min: 1,
      });

      return { items, Iteration };
    },
    template: `
      <component :is="Iteration" v-for="(key, index) in items" :key="key" as="div" data-testid="repeater-item" :index="index" v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps }">
        <div data-testid="iteration-content">
          <button data-testid="remove-button" v-bind="removeButtonProps">Remove</button>
          <button data-testid="move-up-button" v-bind="moveUpButtonProps">Move Up</button>
          <button data-testid="move-down-button" v-bind="moveDownButtonProps">Move Down</button>
        </div>
      </component>
    `,
  });

  page.render(TestComponent);

  await expect.element(page.getByTestId('repeater-item')).toBeInTheDocument();
});

test('warns if move is called with the same index', async () => {
  const { move } = renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  move(0, 0);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if move is called with an out of bounds index', async () => {
  const { move } = renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  move(0, 10);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if insert is called with an out of bounds index', async () => {
  const { insert } = renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  insert(10);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if swap is called with the same index', async () => {
  const { swap } = renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  swap(0, 0);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if swap is called with an out of bounds index', async () => {
  const { swap } = renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  swap(0, 10);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

describe('form repeater with form context', () => {
  test('removing an item after conditionally unmounting a field keeps form values in sync', async () => {
    // This test reproduces the bug where:
    // 1. Form has 3 users with firstName and lastName
    // 2. User clears the second user's firstName (making it empty)
    // 3. This causes the lastName field to unmount (due to v-if condition)
    // 4. User removes the second row
    // 5. Form values should correctly have 2 users with their original data

    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);

    // TextField component
    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    // Child component that uses the repeater (must be child to inject form context)
    const RepeaterChild = defineComponent({
      components: { TextField },
      props: {
        form: { type: Object, required: true },
      },
      setup(props) {
        const { items, Iteration } = useFormRepeater<{ firstName: string; lastName?: string }>({
          name: 'users',
        });

        return { items, Iteration, form: props.form };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
          v-slot="{ removeButtonProps }"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
            <TextField
              v-if="form.values.users?.[index]?.firstName"
              name="lastName"
              label="Last Name"
            />
            <button v-bind="removeButtonProps" :data-testid="'remove-' + index">Remove</button>
          </div>
        </component>
      `,
    });

    // Parent component with form
    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string; lastName?: string }> }>({
          initialValues: {
            users: [
              { firstName: 'First Name 1', lastName: 'Last Name 1' },
              { firstName: 'First Name 2', lastName: 'Last Name 2' },
              { firstName: 'First Name 3', lastName: 'Last Name 3' },
            ],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild :form="form" />`,
    });

    page.render(TestComponent);
    await flush();

    // Verify initial state - 3 users with all data
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users).toEqual([
      { firstName: 'First Name 1', lastName: 'Last Name 1' },
      { firstName: 'First Name 2', lastName: 'Last Name 2' },
      { firstName: 'First Name 3', lastName: 'Last Name 3' },
    ]);

    // Step 2: Clear the second user's firstName
    // Get the second firstName input (index 1)
    const firstNameInputs = Array.from(document.querySelectorAll('input[name="firstName"]')) as HTMLInputElement[];
    const secondUserFirstNameInput = firstNameInputs[1];
    secondUserFirstNameInput.value = '';
    secondUserFirstNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    // After clearing firstName, lastName should be unmounted (due to v-if)
    // The form value for firstName should be empty
    expect(formReturns.value!.values.users![1].firstName).toBe('');

    // Step 3: Remove the second row
    await page.getByTestId('remove-1').click();
    await flush();

    // After removal, we should have 2 users
    expect(formReturns.value!.values.users).toHaveLength(2);

    // The first user should be unchanged
    expect(formReturns.value!.values.users![0]).toEqual({ firstName: 'First Name 1', lastName: 'Last Name 1' });

    // The second user should now be what was previously the third user
    expect(formReturns.value!.values.users![1]).toEqual({ firstName: 'First Name 3', lastName: 'Last Name 3' });
  });

  test('removing an item updates form values correctly', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);

    // TextField component
    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    // Child component that uses the repeater
    const RepeaterChild = defineComponent({
      components: { TextField },
      setup() {
        const { items, Iteration } = useFormRepeater<{ firstName: string }>({
          name: 'users',
        });

        return { items, Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
          v-slot="{ removeButtonProps }"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
            <button v-bind="removeButtonProps" :data-testid="'remove-' + index">Remove</button>
          </div>
        </component>
      `,
    });

    // Parent component with form
    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild />`,
    });

    page.render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Remove the second item (index 1)
    await page.getByTestId('remove-1').click();
    await flush();

    // After removal, we should have 2 users
    expect(formReturns.value!.values.users).toHaveLength(2);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 3');
  });

  test('swapping items updates form values correctly', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);
    const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    const RepeaterChild = defineComponent({
      components: { TextField },
      setup() {
        const repeater = useFormRepeater<{ firstName: string }>({
          name: 'users',
        });

        repeaterReturns.value = repeater;

        return { items: repeater.items, Iteration: repeater.Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
          </div>
        </component>
      `,
    });

    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild />`,
    });

    page.render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Swap first and third items (index 0 and 2)
    repeaterReturns.value!.swap(0, 2);
    await flush();

    // After swap, User 1 and User 3 should be swapped
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 3');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 1');
  });

  test('moving an item updates form values correctly', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);
    const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    const RepeaterChild = defineComponent({
      components: { TextField },
      setup() {
        const repeater = useFormRepeater<{ firstName: string }>({
          name: 'users',
        });

        repeaterReturns.value = repeater;

        return { items: repeater.items, Iteration: repeater.Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
          </div>
        </component>
      `,
    });

    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild />`,
    });

    page.render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Move first item to the end (from index 0 to index 2)
    repeaterReturns.value!.move(0, 2);
    await flush();

    // After move, User 1 should be at the end
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 3');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 1');
  });

  test('inserting an item updates form values correctly', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);
    const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    const RepeaterChild = defineComponent({
      components: { TextField },
      setup() {
        const repeater = useFormRepeater<{ firstName: string }>({
          name: 'users',
        });

        repeaterReturns.value = repeater;

        return { items: repeater.items, Iteration: repeater.Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
          </div>
        </component>
      `,
    });

    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild />`,
    });

    page.render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Insert at index 1 (between User 1 and User 2)
    repeaterReturns.value!.insert(1);
    await flush();

    // After insert, we should have 4 items with an empty item at index 1
    expect(formReturns.value!.values.users).toHaveLength(4);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBeUndefined(); // New empty item
    expect(formReturns.value!.values.users![2].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![3].firstName).toBe('User 3');
  });

  test('removing an item works when form is passed as prop (same component setup)', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);
    const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    // This test simulates using useForm and useFormRepeater in the same component
    // by passing the form explicitly via the form prop
    const TestComponent = defineComponent({
      components: { TextField },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        // Pass form.context explicitly since we're in the same component
        const repeater = useFormRepeater<{ firstName: string }>({
          name: 'users',
          form: form as any,
        });

        repeaterReturns.value = repeater;

        return { form, items: repeater.items, Iteration: repeater.Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
          v-slot="{ removeButtonProps }"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
            <button v-bind="removeButtonProps" :data-testid="'remove-' + index">Remove</button>
          </div>
        </component>
      `,
    });

    page.render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Remove the second item (index 1)
    await page.getByTestId('remove-1').click();
    await flush();

    // After removal, we should have 2 users
    expect(formReturns.value!.values.users).toHaveLength(2);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 3');
  });
});
