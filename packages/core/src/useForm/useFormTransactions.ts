import { nextTick } from 'vue';
import { FormObject, Path, PathValue } from '../types';
import { BaseFormContext } from './formContext';

interface BaseStateTransaction<TForm extends FormObject> {
  path: Path<TForm>;
  value: PathValue<TForm, Path<TForm>>;
  touched: boolean;
  blurred: boolean;
  dirty: boolean;
  disabled: boolean;
  errors: string[];
}

interface SetPathStateTransaction<TForm extends FormObject> extends BaseStateTransaction<TForm> {
  kind: 2;
}

interface UnsetPathStateTransaction<TForm extends FormObject> {
  kind: 1;
  path: Path<TForm>;
}

interface DestroyPathStateTransaction<TForm extends FormObject> {
  kind: 0;
  path: Path<TForm>;
}

interface InitializeFieldTransaction<TForm extends FormObject> extends BaseStateTransaction<TForm> {
  kind: 3;
}

interface ArrayMutTransaction<TForm extends FormObject> {
  kind: 4;
  path: Path<TForm>;
  value: unknown[];
}

export type FormTransaction<TForm extends FormObject> =
  | SetPathStateTransaction<TForm>
  | UnsetPathStateTransaction<TForm>
  | DestroyPathStateTransaction<TForm>
  | InitializeFieldTransaction<TForm>
  | ArrayMutTransaction<TForm>;

/**
 * Transaction kinds, we use numbers for faster comparison and easier sorting.
 * ARRAY_MUT has the highest value to be processed first (after sorting descending).
 */
const TransactionKind = {
  ARRAY_MUT: 4,
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
        'getValues' | 'getValue' | 'isFieldSet' | 'isTouched' | 'isBlurred' | 'getErrors' | 'isDirty'
      >,
      codes: typeof TransactionKind,
    ) => FormTransaction<TForm> | null,
  ): void;
}

export function useFormTransactions<TForm extends FormObject>(form: BaseFormContext<TForm>) {
  const transactions = new Set<FormTransaction<TForm>>([]);

  let tick: Promise<void>;

  // Track array paths that have been mutated - persisted across batches
  const mutatedArrayPaths = new Set<string>();
  let clearMutatedPathsTimeout: ReturnType<typeof setTimeout> | null = null;

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

    // Process ARRAY_MUT transactions first (they have highest kind value so come first after sorting)
    for (const tr of trs) {
      if (tr.kind === TransactionKind.ARRAY_MUT) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.setValue(tr.path as any, tr.value as any);
        mutatedArrayPaths.add(tr.path);

        // Schedule clearing of mutated paths after field transactions have been processed
        // This allows subsequent field destroy/set transactions to be filtered out
        if (clearMutatedPathsTimeout) {
          clearTimeout(clearMutatedPathsTimeout);
        }
        clearMutatedPathsTimeout = setTimeout(() => {
          mutatedArrayPaths.clear();
          clearMutatedPathsTimeout = null;
        }, 0);
      }
    }

    // Process remaining transactions, filtering out those under mutated array paths
    for (const tr of trs) {
      // Skip ARRAY_MUT as they've already been processed
      if (tr.kind === TransactionKind.ARRAY_MUT) {
        continue;
      }

      // Skip DESTROY_PATH and SET_PATH transactions for paths under mutated arrays
      // These are stale transactions from fields that were part of the array before mutation
      // Allow INIT_PATH through as those are for newly mounted fields
      if (
        (tr.kind === TransactionKind.DESTROY_PATH || tr.kind === TransactionKind.SET_PATH) &&
        isPathUnderMutatedArray(tr.path, mutatedArrayPaths)
      ) {
        continue;
      }

      if (tr.kind === TransactionKind.SET_PATH) {
        form.setValue(tr.path, tr.value);
        form.setTouched(tr.path, tr.touched);
        form.setBlurred(tr.path, tr.blurred);
        form.setDirty(tr.path, tr.dirty);
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
        form.setBlurred(tr.path, tr.blurred);
        form.setDirty(tr.path, tr.dirty);
        form.unsetInitialValue(tr.path);
        form.setErrors(tr.path, tr.errors);
        continue;
      }
    }

    transactions.clear();
  }

  /**
   * Check if a path is under any of the mutated array paths.
   * For example, if 'users' is mutated, then 'users.0.firstName' is under it.
   */
  function isPathUnderMutatedArray(path: string, mutatedArrayPaths: Set<string>): boolean {
    for (const arrayPath of mutatedArrayPaths) {
      // Check if the path starts with the array path followed by a dot or bracket
      if (path.startsWith(arrayPath + '.') || path.startsWith(arrayPath + '[')) {
        return true;
      }
    }
    return false;
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
