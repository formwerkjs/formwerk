import { createApp, defineComponent, Component } from 'vue';

let container: HTMLElement | null = null;
let currentApp: ReturnType<typeof createApp> | null = null;

interface ComponentOptions {
  setup?: () => Record<string, unknown>;
  template?: string;
  components?: Record<string, Component>;
}

/**
 * Renders a component inside a proper Vue app instance.
 * This ensures refs have proper owner context, avoiding Vue 3.5's
 * "Missing ref owner context" warning with hoisted vnodes.
 *
 * Accepts the same signature as vitest-browser-vue's page.render()
 */
export function appRender(options: any) {
  // Clean up previous render
  if (currentApp) {
    currentApp.unmount();
    currentApp = null;
  }

  if (container) {
    container.remove();
    container = null;
  }

  // Create a fresh container
  container = document.createElement('div');
  container.id = 'app-render-root';
  document.body.appendChild(container);

  // Convert options to a component if needed
  const component =
    typeof options === 'object' && ('setup' in options || 'template' in options)
      ? defineComponent(options as ComponentOptions)
      : (options as Component);

  // Create and mount the app directly
  currentApp = createApp(component);
  currentApp.mount(container);

  return {
    unmount() {
      if (currentApp) {
        currentApp.unmount();
        currentApp = null;
      }
      if (container) {
        container.remove();
        container = null;
      }
    },
  };
}

/**
 * Cleanup function to be called after tests
 */
export function cleanupAppRender() {
  if (currentApp) {
    currentApp.unmount();
    currentApp = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
}
