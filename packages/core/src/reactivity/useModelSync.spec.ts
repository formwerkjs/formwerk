import { useSyncModel } from './useModelSync';
import { nextTick, ref } from 'vue';
import { page } from 'vitest/browser';

test('emits model update event when model changes', async () => {
  const model = ref('value');
  const emittedEvents: string[] = [];

  // Create a child component that uses useSyncModel
  const Child = {
    template: `<div></div>`,
    emits: ['update:modelValue'],
    setup() {
      useSyncModel({
        model,
        onModelPropUpdated: value => {
          model.value = value;
        },
      });
    },
  };

  // Parent captures emitted events
  page.render({
    components: { Child },
    setup() {
      return {
        onUpdate: (_val: unknown) => {
          emittedEvents.push('update:modelValue');
        },
      };
    },
    template: `<Child @update:modelValue="onUpdate" />`,
  });

  model.value = 'new value';
  await nextTick();
  await expect.poll(() => emittedEvents).toContain('update:modelValue');
});

test('calls model callback when prop changes', async () => {
  const spy = vi.fn();
  const model = ref('value');

  const Child = {
    template: `<div></div>`,
    props: ['modelValue'],
    setup() {
      useSyncModel({
        model: ref('value'),
        onModelPropUpdated: spy,
      });
    },
  };

  page.render({
    setup() {
      return {
        model,
      };
    },
    components: { Child },
    template: `<Child v-model="model" />`,
    props: ['modelValue'],
  });

  model.value = 'new value';
  await nextTick();
  expect(spy).toHaveBeenCalledWith('new value');
});
