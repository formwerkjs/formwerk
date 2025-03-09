import { nextTick, onMounted, ref } from 'vue';
import { useConstraintsValidator } from './useConstraintsValidator';
import { fireEvent, render, screen } from '@testing-library/vue';
import { renderSetup } from '@test-utils/index';

describe('useConstraintsValidator', () => {
  describe('text constraints', () => {
    test('creates an input element with text type', async () => {
      const source = ref<HTMLElement>();
      const value = ref('test');

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'text',
          value,
          source,
        });
      });

      expect(element.value?.type).toBe('text');
      expect(element.value?.value).toBe('test');
    });

    test('sets required attribute', async () => {
      const source = ref<HTMLElement>();
      const value = ref('test');
      const required = ref(true);

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'text',
          value,
          source,
          required,
        });
      });

      expect(element.value?.required).toBe(true);

      // Change required value
      required.value = false;
      await nextTick();
      expect(element.value?.required).toBe(false);
    });

    test('sets minLength and maxLength attributes', async () => {
      const source = ref<HTMLElement>();
      const value = ref('test');
      const minLength = ref(2);
      const maxLength = ref(10);

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'text',
          value,
          source,
          minLength,
          maxLength,
        });
      });

      expect(element.value?.getAttribute('minlength')).toBe('2');
      expect(element.value?.getAttribute('maxlength')).toBe('10');

      // Change min/max values
      minLength.value = 3;
      maxLength.value = 20;
      await nextTick();
      expect(element.value?.getAttribute('minlength')).toBe('3');
      expect(element.value?.getAttribute('maxlength')).toBe('20');
    });

    test('updates value when source value changes', async () => {
      const source = ref<HTMLElement>();
      const value = ref('test');

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'text',
          value,
          source,
        });
      });

      expect(element.value?.value).toBe('test');

      value.value = 'updated';
      await nextTick();
      expect(element.value?.value).toBe('updated');
    });
  });

  describe('select constraints', () => {
    test('creates an input element with text type for select', async () => {
      const source = ref<HTMLElement>();
      const value = ref('option1');

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'select',
          value,
          source,
        });
      });

      expect(element.value?.type).toBe('text');
      expect(element.value?.value).toBe('option1');
    });
  });

  describe('number constraints', () => {
    test('creates an input element with number type', async () => {
      const source = ref<HTMLElement>();
      const value = ref(42);

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'number',
          value,
          source,
        });
      });

      expect(element.value?.type).toBe('number');
      expect(element.value?.value).toBe('42');
    });

    test('sets min and max attributes', async () => {
      const source = ref<HTMLElement>();
      const value = ref(42);
      const min = ref(0);
      const max = ref(100);

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'number',
          value,
          source,
          min,
          max,
        });
      });

      expect(element.value?.getAttribute('min')).toBe('0');
      expect(element.value?.getAttribute('max')).toBe('100');

      // Change min/max values
      min.value = 10;
      max.value = 200;
      await nextTick();
      expect(element.value?.getAttribute('min')).toBe('10');
      expect(element.value?.getAttribute('max')).toBe('200');
    });
  });

  describe('date constraints', () => {
    test('creates an input element with date type', async () => {
      const source = ref<HTMLElement>();
      const value = ref(new Date('2023-01-01'));

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'date',
          value,
          source,
        });
      });

      expect(element.value?.type).toBe('date');
      expect(element.value?.value).toBe('2023-01-01');
    });

    test('sets min and max date attributes', async () => {
      const source = ref<HTMLElement>();
      const value = ref(new Date('2023-01-15'));
      const min = ref(new Date('2023-01-01'));
      const max = ref(new Date('2023-01-31'));

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'date',
          value,
          source,
          min,
          max,
        });
      });

      expect(element.value?.getAttribute('min')).toBe('2023-01-01');
      expect(element.value?.getAttribute('max')).toBe('2023-01-31');

      // Change min/max values
      min.value = new Date('2023-02-01');
      max.value = new Date('2023-02-28');
      await nextTick();
      expect(element.value?.getAttribute('min')).toBe('2023-02-01');
      expect(element.value?.getAttribute('max')).toBe('2023-02-28');
    });

    test('handles null date values', async () => {
      const source = ref<HTMLElement>();
      const value = ref<Date | null>(null);

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'date',
          value,
          source,
        });
      });

      expect(element.value?.value).toBe('');

      value.value = new Date('2023-03-15');
      await nextTick();
      expect(element.value?.value).toBe('2023-03-15');
    });
  });

  describe('event handling', () => {
    test('forwards events from source to element', async () => {
      const source = ref<HTMLElement>();
      const value = ref('test');
      const dispatchedEvents: string[] = [];

      await render({
        setup: () => {
          const { element } = useConstraintsValidator({
            type: 'text',
            value,
            source,
          });

          onMounted(() => {
            // Mock the dispatchEvent method to track events
            element.value!.dispatchEvent = ((event: Event) => {
              dispatchedEvents.push(event.type);
              return true;
            }) as any;
          });

          return { source };
        },
        template: `<div ref="source" data-testid="source"></div>`,
      });

      await nextTick();

      // Trigger events on the source element
      await fireEvent.change(screen.getByTestId('source'));
      await fireEvent.blur(screen.getByTestId('source'));
      await fireEvent.input(screen.getByTestId('source'));

      // Check if events were forwarded to the element
      expect(dispatchedEvents).toContain('change');
      expect(dispatchedEvents).toContain('blur');
      expect(dispatchedEvents).toContain('input');
    });
  });

  describe('edge cases', () => {
    test('handles undefined constraints values', async () => {
      const source = ref<HTMLElement>();
      const value = ref<string | undefined>(undefined);

      const { element } = await renderSetup(() => {
        return useConstraintsValidator({
          type: 'text',
          value,
          source,
          minLength: undefined,
          maxLength: undefined,
          required: undefined,
        });
      });

      expect(element.value?.required).toBe(false);
      expect(element.value?.getAttribute('minlength')).toBe('');
      expect(element.value?.getAttribute('maxlength')).toBe('');
      expect(element.value?.value).toBe('');
    });
  });
});
