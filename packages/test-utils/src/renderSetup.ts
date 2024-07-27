import { render } from '@testing-library/vue';

export async function renderSetup<TReturns>(setup: () => TReturns): Promise<TReturns> {
  let returns!: TReturns;
  const withSetupReturns = () => {
    returns = setup();

    return returns;
  };

  await render({ template: '<div></div>', setup: withSetupReturns });

  return returns;
}
