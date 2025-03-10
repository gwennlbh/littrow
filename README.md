# littrow

> [!WARNING]
> Very WIP atm. I'm in the process of extracting application-specific code from [a end-user project](https://git.inpt.fr/cigale/app/-/tree/main/src/lib/idb.svelte.js)

IndexedDB client with Prisma/Drizzle-like ergonomics. Define your tables (object stores) as ArkType schemas, sync up data with your frontend via various adapters (Svelte 5 for now).

## Usage

```ts
import { table, Littrow } from "littrow"
import { type } from "arktype"

const User = table(
  type({
    id: "string", // id is the default index
    name: "string",
    age: "number",
  })
)

const db = await new Littrow("mydatabase", { User }).open()
```
