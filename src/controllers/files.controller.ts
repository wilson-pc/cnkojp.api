import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { files, folders } from '../schema'

const filesRouter = new Hono()


filesRouter.get('/folder/:folderId', async (c) => {
    const folderId= c.req.param('folderId')
  const foldersRs = await db.query.files.findMany({
    where: eq(files.folderId, folderId),
    orderBy: desc(folders.createdAt)
  })
  return c.json(foldersRs.map(f => {
    return {
        ...f,
        thumbAnimated:`https://ik.imagekit.io/ebfrktu6zh/`+f.thumbAnimated?.trim(),
    }
  }))
})


filesRouter.get('/:fileId', async (c) => {
    const fileId= c.req.param('fileId')
    const foldersRs = await db.query.files.findFirst({
        where: eq(files.id, fileId),
    })
    if(!foldersRs){
        return c.json({error:'No existe'}, 404)
    }
    return c.json({
        ...foldersRs,
        thumbAnimated:`https://ik.imagekit.io/ebfrktu6zh/`+foldersRs.thumbAnimated?.trim(),
        thumbWhitHeader:`https://ik.imagekit.io/ebfrktu6zh/`+foldersRs.thumbWhitHeader?.trim(),
    })
  })

export default filesRouter