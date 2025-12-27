import { useLocale } from './useLocale';
import { configure } from '../config';
import { nextTick, ref } from 'vue';
import { page } from 'vitest/browser';
import { expect } from 'vitest';

test('fetches the site locale and direction initially', async () => {
  page.render({
    setup: () => useLocale(),
    template: `
      <span>{{ locale }}</span>
      <span>{{ direction }}</span>
    `,
  });

  await expect.element(page.getByText('en')).toBeInTheDocument();
  await expect.element(page.getByText('ltr')).toBeInTheDocument();
});

test('updates the locale when the locale config changes', async () => {
  page.render({
    setup: () => useLocale(),
    template: `
      <span>{{ locale }}</span>
      <span>{{ direction }}</span>
    `,
  });

  configure({ locale: 'ar-EG' });
  await nextTick();

  await expect.element(page.getByText('ar-EG')).toBeInTheDocument();
  await expect.element(page.getByText('rtl')).toBeInTheDocument();
});

test('updates locale and direction when a reactive locale config changes', async () => {
  const locale = ref('en-US');
  configure({ locale });

  page.render({
    setup: () => useLocale(),
    template: `
      <span>{{ locale }}</span>
      <span>{{ direction }}</span>
    `,
  });

  await expect.element(page.getByText('en-US')).toBeInTheDocument();
  await expect.element(page.getByText('ltr')).toBeInTheDocument();

  locale.value = 'ar-EG';
  await nextTick();

  await expect.element(page.getByText('ar-EG')).toBeInTheDocument();
  await expect.element(page.getByText('rtl')).toBeInTheDocument();
});
