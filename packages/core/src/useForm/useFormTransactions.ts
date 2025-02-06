import { nextTick } from 'vue';
import { FormObject, Path, PathValue } from '../types';
import { BaseFormContext } from './formContext';

interface SetPathStateTransaction<TForm extends FormObject> {
  kind: 2;
  path: Path<TForm>;
  value: PathValue<TForm, Path<TForm>>;
  touched: boolean;
  disabled: boolean;
  errors: string[];
}

interface UnsetPathStateTransaction<TForm extends FormObject> {
  kind: 1;
  path: Path<TForm>;
}

interface DestroyPathStateTransaction<TForm extends FormObject> {
  kind: 0;
  path: Path<TForm>;
}

interface InitializeFieldTransaction<TForm extends FormObject> {
  kind: 3;
  path: Path<TForm>;
  value: PathValue<TForm, Path<TForm>>;
  touched: boolean;
  disabled: boolean;
  errors: string[];
}

export type FormTransaction<TForm extends FormObject> =
  | SetPathStateTransaction<TForm>
  | UnsetPathStateTransaction<TForm>
  | DestroyPathStateTransaction<TForm>
  | InitializeFieldTransaction<TForm>;

/**
 * Transaction kinds, we use numbers for faster comparison and easier sorting.
 */
const TransactionKind = {
  INIT_PATH: 3,
  SET_PATH: 2,
  UNSET_PATH: 1,
  DESTROY_PATH: 0,
} as const;

export interface FormTransactionManager<TForm extends FormObject> {
  transaction(
    tr: (
      formCtx: Pick<
        BaseFormContext<TForm>,
        'getValues' | 'getFieldValue' | 'isFieldSet' | 'isTouched' | 'getFieldErrors'
      >,
      codes: typeof TransactionKind,
    ) => FormTransaction<TForm> | null,
  ): void;
}

export function useFormTransactions<TForm extends FormObject>(form: BaseFormContext<TForm>) {
  const transactions = new Set<FormTransaction<TForm>>([]);

  let tick: Promise<void>;

  function transaction(
    tr: (formCtx: BaseFormContext<TForm>, codes: typeof TransactionKind) => FormTransaction<TForm> | null,
  ) {
    const commit = tr(form, TransactionKind);
    if (commit) {
      transactions.add(commit);
    }

    processTransactions();
  }

  async function processTransactions() {
    const upcomingTick = nextTick();
    tick = upcomingTick;

    await upcomingTick;
    if (tick !== upcomingTick || !transactions.size) {
      return;
    }

    /**
     * Unset transactions should be processed first to ensure that any fields that reclaim the same path maintain their value.
     */
    const trs = cleanTransactions(transactions);

    for (const tr of trs) {
      if (tr.kind === TransactionKind.SET_PATH) {
        form.setValue(tr.path, tr.value);
        form.setTouched(tr.path, tr.touched);
        form.setFieldDisabled(tr.path, tr.disabled);
        form.setErrors(tr.path, tr.errors);
        continue;
      }

      if (tr.kind === TransactionKind.DESTROY_PATH) {
        form.destroyPath(tr.path);
        continue;
      }

      if (tr.kind === TransactionKind.UNSET_PATH) {
        form.unsetPath(tr.path);
        continue;
      }

      if (tr.kind === TransactionKind.INIT_PATH) {
        const formInit = form.getFieldInitialValue(tr.path);
        form.setValue(tr.path, tr.value ?? formInit);
        form.setFieldDisabled(tr.path, tr.disabled);
        form.setTouched(tr.path, tr.touched);
        form.unsetInitialValue(tr.path);
        form.setErrors(tr.path, tr.errors);
        continue;
      }
    }

    transactions.clear();
  }

  const ctx: FormTransactionManager<TForm> = { transaction };

  return ctx;
}

function cleanTransactions<TForm extends FormObject>(
  transactions: Set<FormTransaction<TForm>>,
): FormTransaction<TForm>[] {
  const SET_OPTS = [TransactionKind.SET_PATH, TransactionKind.INIT_PATH] as number[];

  const trs = Array.from(transactions)
    .filter((t, _, ops) => {
      // Remove unset/destroy operations that have a corresponding set operation.
      if (t.kind === TransactionKind.UNSET_PATH || t.kind === TransactionKind.DESTROY_PATH) {
        return !ops.some(op => SET_OPTS.includes(op.kind) && op.path === t.path);
      }

      return true;
    })
    .map(t => {
      if (t.kind === TransactionKind.UNSET_PATH) {
        return {
          kind: TransactionKind.DESTROY_PATH,
          path: t.path,
        };
      }

      return t;
    })
    .sort((a, b) => {
      return a.kind - b.kind;
    });

  return trs;
}
