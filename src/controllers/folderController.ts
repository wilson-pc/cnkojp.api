import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { folders } from '../schema/index'

const folderRoute = new Hono()

folderRoute.post('/', async (c) => {
  const body = await c.req.json()
  const [created] = await db
    .insert(folders)
    .values({
      name: body.name,
      description: body.description,
      chatId: body.chatId
    })
    .returning()

  return c.json(created)
})
folderRoute.get('/', async (c) => {
  const foldersRs = await db.query.folders.findMany({
    orderBy: desc(folders.createdAt)
  })
  return c.json(foldersRs)
})

export default folderRoute
