import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

let _db: Db | undefined

function getDb(): Db {
  if (!_db) {
    const client = createClient({
      url: process.env.DATABASE_URL ?? 'file:./data/dev.db',
    })
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy({} as Db, {
  get(_, prop) {
    const instance = getDb()
    return Reflect.get(instance, prop, instance)
  },
})
