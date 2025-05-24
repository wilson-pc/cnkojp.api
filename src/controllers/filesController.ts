import { Hono } from 'hono'
import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { files, FileSelect, folders } from '../schema/index'
import { customSelect } from '../utils'

const filesRouter = new Hono()


filesRouter.get('/folder/:folderId', async (c) => {
    const folderId= c.req.param('folderId')

    const pageI = c.req.query('page')
    const takeI= c.req.query('take')
    const select= c.req.query('select')

    let page = Number(pageI ?? 0)
    let skip = 0
    let take = Number(takeI ?? 0)
    if (take > 0 && page > 0) {
      page = page > 0 ? page - 1 : 0;
      skip = page > 0 ? page * take : 0;

    }

  const foldersRs = await db.query.files.findMany({
    where: and(eq(files.folderId, folderId), eq(files.delete, false)),
    limit: take===0?undefined:take,
    offset: skip,
    columns: select ? customSelect(select?.split(",")) : null,
    orderBy: desc(folders.createdAt)
  })
  return c.json(foldersRs.map((f:any) => {
    return {
        ...f,
        thumbAnimated:f.thumbAnimated? `https://ik.imagekit.io/ebfrktu6zh/`+f.thumbAnimated?.trim():null,
    }
  }))
})


filesRouter.get('/:fileId', async (c) => {
    const fileId= c.req.param('fileId')
    const foldersRs = await db.query.files.findFirst({
        where: and(eq(files.id, fileId), eq(files.delete, false)),
    })
    console.log(foldersRs,fileId)
    if(!foldersRs){
        return c.json({error:'No existe'}, 404)
    }
    return c.json({
        ...foldersRs,
        thumbAnimated:`https://ik.imagekit.io/ebfrktu6zh/`+foldersRs.thumbAnimated?.trim(),
        thumbWhitHeader:`https://ik.imagekit.io/ebfrktu6zh/`+foldersRs.thumbWhitHeader?.trim(),
    })
  })
  filesRouter.get('/count/pages', async (c) => {

    const folderId = c.req.query('folderId')
    const total = await db.select({ value: count() }).from(files).where(and(eq(files.folderId, folderId??''), eq(files.delete, false)));
    return c.text(total[0].value.toString())
  });

export default filesRouter