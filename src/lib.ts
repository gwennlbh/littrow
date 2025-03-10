import * as arktype from "arktype"
import { IDBPDatabase } from "idb"
import * as idb from "idb"
import { entries, satisfy } from "./utils"

/**
 * A table is a arktype Type with special metadata added to it. See the `table` function to define tables.
 */
export type Table<
  Schema extends arktype.Type,
  Indexes extends readonly string[]
> = {
  schema: Schema
  indexes: Indexes
}

/**
 *
 * @param keyPaths expanded to an array.
 * Every element is an index to be created.
 * Indexes are dot-joined paths to keys in the objects.
 * First index is given as the keyPath argument when creating the object store instead.
 * @param schema
 */
export function table<
  Schema extends arktype.Type,
  Indexes extends readonly string[] | string
>(
  keyPaths: Indexes,
  schema: Schema
): Table<Schema, Indexes extends string ? [Indexes] : Indexes> {
  const expandedKeyPaths = Array.isArray(keyPaths)
    ? keyPaths.map((keyPath) => keyPath)
    : [keyPaths]

  return {
    schema,
    indexes: expandedKeyPaths as Indexes extends string ? [Indexes] : Indexes,
  }
}

/**
 * An interface that should be implemented by the reactive state you pass when creating a Littrow instance.
 */
export interface ReactiveState {
  get(table: string): any[]
  set(table: string, value: any[]): void
}

const noopReactiveState: ReactiveState = {
  get: () => [],
  set: () => {},
}

export async function Littrow<
  Tables extends Record<string, Table<arktype.Type, readonly string[]>>,
  DBSchema = IDBSchema<Tables>
>(
  dbname: string,
  tables: Tables,
  reactiveState: ReactiveState = noopReactiveState
) {
  const _db = await idb.openDB<DBSchema>(dbname, 1, {
    upgrade: (db) => {
      for (const [name, tabledef] of entries(this.tables)) {
        const [keyPath, ...indexes] = tabledef.indexes
        // @ts-ignore
        const store = db.createObjectStore(name, { keyPath })
        for (const index of indexes) {
          // @ts-ignore
          store.createIndex(index, index)
        }
      }
    },
  })

  function wrangler<Store extends keyof Tables>(
    name: Store,
    tx?: idb.IDBPTransaction<DBSchema, [Store], "readwrite">
  ) {
    return {
      raw: {
        async get(id: string): Promise<Tables[Store]["schema"]["inferIn"]> {
          if (tx) return tx.objectStore(name).get(id)
          // @ts-expect-error
          return _db.get(name, id)
        },
      },
      async get(id: string): Promise<Tables[Store]["schema"]["infer"]> {
        return tables[name].schema.assert(await this.raw.get(id))
      },
    }
  }

  const wranglers = Object.fromEntries(
    Object.keys(tables).map((name) => [name, wrangler(name)])
  ) as {
    [K in keyof Tables]: ReturnType<typeof wrangler<K>>
  }

  type Txn<Store extends keyof Tables, Mode extends IDBTransactionMode> = {
    [K in Store]: ReturnType<typeof wrangler<K>>
  } & {
    // @ts-expect-error
    tx: idb.IDBPTransaction<DBSchema, Store, Mode>
  }

  return {
    ...wranglers,
    _db,
    tables,

    get tableNames(): Array<keyof Tables> {
      return Object.keys(this.tables)
    },

    get tablesByName(): Array<
      {
        [K in keyof Tables]: [K, Tables[K]]
      }[keyof Tables]
    > {
      return Object.entries(this.tables)
    },

    async transaction<
      ReusedTransactionTables extends keyof Tables,
      NeededTables extends ReusedTransactionTables,
      Mode extends IDBTransactionMode = "readwrite"
    >(
      tableNames: NeededTables[],
      {
        mode,
        tx,
      }: {
        mode?: Mode
        tx?: Txn<ReusedTransactionTables, Mode>
      },
      actions: (tx: Txn<NeededTables, Mode>) => void | Promise<void>
    ) {
      // @ts-expect-error
      if (tx) return actions(tx)

      const transaction = _db.transaction(tableNames, mode)
      await actions({
        tx: transaction,
        ...Object.fromEntries(tableNames.map((name) => [name, wrangler(name)])),
      })
      transaction.commit()
      for (const table of tableNames) {
        reactiveState.set(table, await _db.getAll(table))
      }
    },
  }
}

type IDBSchema<
  Tables extends Record<string, Table<arktype.Type, readonly string[]>>
> = satisfy<
  idb.DBSchema,
  {
    [Name in keyof Tables]: {
      value: Tables[Name]["schema"]["inferIn"]
      key: string
      indexes: {
        [IndexName in Tables[Name]["indexes"][number]]: string
      }
    }
  }
>
