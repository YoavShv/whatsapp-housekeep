import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// Placeholder — real schema added in issue #2 (Database schema & migrations)
export const placeholder = sqliteTable('placeholder', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
})
