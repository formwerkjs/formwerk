import { render } from '@testing-library/vue';
import { useSyncModel } from './useModelSync';
import { nextTick, ref } from 'vue';

test('emits model update event when model changes', async () => {
  const model = ref('value');

  const result = render({
    template: `<div></div>`,
    setup() {
      useSyncModel({
        model,
        onModelPropUpdated: value => {
          model.value = value;
        },
      });
    },
  });

  model.value = 'new value';
  await nextTick();
  expect(result.emitted()).toHaveProperty('update:modelValue');
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

  render({
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
