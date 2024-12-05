import { createApp } from 'vue';
// import './style.css';
import App from './App.vue';
import { createI18n } from 'vue-i18n';
import { configure } from '@formwerk/core';

const i18n = createI18n({
  locale: 'en-US',
  fallbackLocale: 'en-US',
  availableLocales: ['en-US', 'ar-EG'],
  legacy: false,
});

configure({ locale: i18n.global.locale });

const app = createApp(App);

app.use(i18n);
app.mount('#app');
