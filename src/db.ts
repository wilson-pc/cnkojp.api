import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema/index'
import { createClient } from '@libsql/client'
import 'dotenv/config'
const libClient = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
})
export const db = drizzle({ client: libClient, schema: schema })
