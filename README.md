# littrow

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
