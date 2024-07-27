import { InjectionKey, nextTick, provide } from 'vue';
import { FormObject, Path, PathValue } from '../types';
import { FormContext } from './context';

interface SetFieldValueTransaction<TForm extends FormObject> {
  kind: 'setPath';
  path: Path<TForm>;
  value: PathValue<TForm, Path<TForm>>;
}

interface UnsetFieldValueTransaction<TForm extends FormObject> {
  kind: 'unsetPath';
  path: Path<TForm>;
}

export type FormTransaction<TForm extends FormObject> =
  | SetFieldValueTransaction<TForm>
  | UnsetFieldValueTransaction<TForm>;

export interface FormTransactionManager<TForm extends FormObject> {
  transaction(
    tr: (
      formCtx: Pick<FormContext<TForm>, 'getValues' | 'getFieldValue' | 'isFieldSet' | 'isFieldTouched'>,
    ) => FormTransaction<TForm> | null,
  ): void;
}

export const FormTransactionManagerKey: InjectionKey<FormTransactionManager<FormObject>> = Symbol(
  'Formwerk FormTransactionManagerKey',
);

export function useFormTransactions<TForm extends FormObject>(form: FormContext<TForm>) {
  const transactions = new Set<FormTransaction<TForm>>([]);

  let tick: Promise<void>;

  function commit(tr: FormTransaction<TForm>) {
    transactions.add(tr);
  }

  function transaction(tr: (formCtx: FormContext<TForm>) => FormTransaction<TForm> | null) {
    const committed = tr(form);
    if (committed) {
      commit(committed);
      processTransactions();
    }
  }

  async function processTransactions() {
    const upcomingTick = nextTick();
    tick = upcomingTick;

    await upcomingTick;
    if (tick !== upcomingTick) {
      return;
    }

    for (const tr of transactions) {
      if (tr.kind === 'setPath') {
        form.setFieldValue(tr.path, tr.value);
        continue;
      }

      if (tr.kind === 'unsetPath') {
        form.destroyPath(tr.path);
        continue;
      }
    }

    transactions.clear();
  }

  const ctx: FormTransactionManager<TForm> = { transaction };

  provide(FormTransactionManagerKey, ctx as FormTransactionManager<FormObject>);

  return ctx;
}
