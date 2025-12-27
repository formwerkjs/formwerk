import { page } from 'vitest/browser';

export function renderSetup<TReturns extends object, TChildReturns extends object | undefined>(
  setup: () => TReturns,
  childSetup?: () => TChildReturns,
): TReturns & TChildReturns {
  const su = withSetupReturns(setup);
  const component = { template: '<div></div>', setup: su, components: {} };
  const csu = childSetup ? withSetupReturns(childSetup) : undefined;
  if (childSetup) {
    const Child = { template: '<div></div>', setup: csu };

    component.template = `<Child />`;
    component.components = { Child };
  }

  page.render(component);

  return {
    ...((su.result || {}) as TReturns),
    ...((csu?.result || {}) as TChildReturns),
  };
}

function withSetupReturns<TReturns>(setup: () => TReturns) {
  let returns!: TReturns;
  const withSetupReturns: { result?: TReturns } & (() => TReturns) = () => {
    returns = setup();
    withSetupReturns.result = returns;

    return returns;
  };

  return withSetupReturns;
}
