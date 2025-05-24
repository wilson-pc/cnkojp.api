import readline from 'readline'
import { basename, extname, resolve } from 'path'
import { existsSync, readFileSync } from 'fs'
import { exec } from 'child_process'
import _ from 'lodash'
import { uploadImage } from './s3'
import { createId } from '@paralleldrive/cuid2'
import { db } from './db'
import { and, eq } from 'drizzle-orm'
import { files, folders, FolderSelect } from './schema/index'
import { fileExistsAndHasWeight, timeout } from './utils'
import { Message, TelegramClient } from '@mtcute/node'
import 'dotenv/config'
import { TelegramMedia } from 'types'

type LocalMessage = Message & { media: TelegramMedia }
let chatId = process.env.CHAT_ID
const newChatId = -1002225807112
const tg = new TelegramClient({
  apiId: Number(process.env.TELEGRAM_API_ID) ?? 0,
  apiHash: process.env.TELEGRAM_API_HASH ?? '',
  storage: 'my-account'
})

;(async () => {
  console.log('Loading interactive example...')
  if ((await checkSignedIn()) === null) {
    const self = await tg.start({
      phone: () => tg.input('Phone > '),
      code: () => tg.input('Code > ')
    })
  } else {
    const self = await tg.start({})
    console.log(`Logged history in as ${self.displayName}`)
  }

  const peerId = isNumber(chatId) ? Number(chatId) : chatId
  const peer = await tg.resolvePeer(peerId ?? '')
  const dialogs = await tg.searchMessages({
    chatId: peer,
    limit: 100,

    filter: {
      _: 'inputMessagesFilterVideo'
    }
  })
  const whitelist = await db.query.whitelist.findMany({
    columns: {
      fileId: true
    }
  })

  console.log(dialogs.length)

  const all = await db.query.files.findMany({
    columns: {
      fileId: true,
      originalUniqueFileId: true
    }
  })
  const allIgnore = [...whitelist, ...all]
  const fde = dialogs.splice(500)

  const chunk = _.chunk(dialogs, 2)
  const currentChat: any = await db.query.folders.findFirst({
    where: eq(folders.chatId, chatId ?? '')
  })

  for await (const messages of chunk) {
    const promises: any[] = []
    messages.forEach((elementr: any, index: number) => {
      const element = elementr as LocalMessage
      console.log('element', element.media.fileId)
      if (
        !allIgnore.find(
          (w:any) =>
            w.fileId === element?.media?.fileId ||
            w.originalUniqueFileId === element?.media?.uniqueFileId
        )
      ) {
        promises.push(downloader(element, index, currentChat))
      } else {
        console.log('ignorando', index)
      }
    })
    await Promise.all(promises)
    console.log('UNA VUELKTA')
  }
  console.log('Done.')
})()

interface FileInfo {
  vibrate: number
  duration: number
  size: number
  format: string
  width: number
  height: number
  coded: string
  codeName: string
}

type VideoInfo = FileInfo & { original: boolean }
async function getInfo(fileName: string): Promise<{ data: FileInfo }> {
  return new Promise((fin, reject) => {
    const dir = exec(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${resolve(
        'downloads/' + fileName
      )}"`,
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        } else {
          let info = JSON.parse(stdout)
          const video = info.streams.find(
            (stream: any) => stream.codec_type === 'video'
          )
          if (video) {
            fin({
              data: {
                vibrate: Number(video.bit_rate) * 0.001,
                duration: Number(info.format.duration),
                size: Number(info.format.size),
                format: info.format.format_name,
                width: video.width,
                height: video.height,
                coded: video.codec_name,
                codeName: video.codec_long_name
              }
            })
          } else {
            reject({ message: 'no video' })
          }
        }
      }
    )
  })
}

async function getInfo2(
  fileName: string,
  path?: string
): Promise<{ data: FileInfo }> {
  return new Promise((fin, reject) => {
    const dir = exec(
      `ffprobe -v quiet -print_format json -show_format -show_streams "F:/png negro/drive/temp/optmized/shunv35/${fileName}"`,
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        } else {
          let info = JSON.parse(stdout)
          const video = info.streams.find(
            (stream: any) => stream.codec_type === 'video'
          )
          if (video) {
            fin({
              data: {
                vibrate: Number(video.bit_rate) * 0.001,
                duration: Number(info.format.duration),
                size: Number(info.format.size),
                format: info.format.format_name,
                width: video.width,
                height: video.height,
                coded: video.codec_name,
                codeName: video.codec_long_name
              }
            })
          } else {
            reject({ message: 'no video' })
          }
        }
      }
    )
  })
}

async function generateThumbLocal(
  fileName: string,
  ext = '.mp4',
  imageName = `${fileName}.avif`
): Promise<{ path: string }> {
  return new Promise(async (fin, reject) => {
    const dir = exec(
      `ffmpeg -ss 10 -t 5 -i "${resolve(
        'downloads/' + fileName
      )}" -c:v av1_qsv -filter_complex "[0:v] fps=3,setpts=0.5*PTS" -f avif "${resolve(
        'thumb/' + imageName
      )}"
      `,
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        }
      }
    )

    dir.on('exit', async function (code) {
      fin({ path: resolve('thumb/' + imageName) })
    })
  })
}

async function generateThumbLocalWithHeader(
  fileName: string,
  inputDirectory: string,
  outputDirectory: string
): Promise<{ path: string }> {
  return new Promise(async (fin, reject) => {
    //    console.log(`pyvideothumbnailer "${inputDirectory}" --columns 3 --rows 3  --header-font DejaVuSans.ttf --timestamp-font DejaVuSans.ttf --jpeg-quality 100 --override_existing --output-directory ${outputDirectory}`)
    await timeout(4000)
    const dir = exec(
      `chcp 65001 | pyvideothumbnailer "${inputDirectory}" --columns 3 --rows 3  --header-font DejaVuSans.ttf --timestamp-font DejaVuSans.ttf --jpeg-quality 100 --override-existing --output-directory ${outputDirectory}`,
      { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      function (err, stdout, stderr) {
        if (err) {
          console.log('Error en pyvideothumbnailer', err)
          reject(err)
          // should have err.code here?
        }
      }
    )

    dir.on('exit', async function (code) {
      const responsePath = `${outputDirectory}/${fileName}.jpg`
      if (existsSync(responsePath)) {
        fin({ path: responsePath })
      } else {
        const dir2 = exec(
          `chcp 65001 | vcsi "${inputDirectory}" -t -g 3x3 --metadata-font-size 20 --metadata-font DejaVuSans.ttf -o "${outputDirectory}/${fileName}.jpg"`,
          { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
          function (err, stdout, stderr) {
            if (err) {
              console.log('Error en pyvideothumbnailer', err)
              reject(err)
              // should have err.code here?
            }
          }
        )

        dir2.on('exit', async function (code) {
          const responsePath = `${outputDirectory}/${fileName}.jpg`

          fin({ path: responsePath })
        })
      }
    })
  })
}

async function generateThumbLocalGrid(
  fileName: string,
  outputDirectory: string
): Promise<{ path: string }> {
  return new Promise(async (fin, reject) => {
    await timeout(4000)
    const dir = exec(
      `chcp 65001 | pyvideothumbnailer "${resolve(
        'downloads/' + fileName
      )}" --columns 3 --rows 3 --timestamp-font DejaVuSans.ttf --jpeg-quality 100 --override-existing --no-header --output-directory ${outputDirectory}`,
      { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        }
      }
    )

    dir.on('exit', async function (code) {
      const responsePath = `${outputDirectory}/${fileName}.jpg`
      if (existsSync(responsePath)) {
        fin({ path: responsePath })
      } else {
        const dir2 = exec(
          `chcp 65001 | generate-video-preview "${resolve(
            'downloads/' + fileName
          )}" "${outputDirectory}/${fileName}.jpg" --rows 3 --cols 3 --quality 1`,
          { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
          function (err, stdout, stderr) {
            if (err) {
              console.log(err)
              reject(err)
              // should have err.code here?
            }
          }
        )

        dir2.on('exit', async function (code) {
          fin({ path: `${outputDirectory}/${fileName}.jpg` })
        })
      }
    })
  })
}
async function optimizeQsvAv1(
  fileName: string,
  preset = 'veryslow',
  quality: string,
  code: string,
  format: string,
  ext = '.mp4'
): Promise<{ path: string }> {
  const fee = `ffmpeg -i "${resolve(
    'downloads/' + fileName
  )}" -c:v ${code} -global_quality ${quality} -preset ${preset} -c:s copy -map_chapters 0 -map 0 -c:a copy "F:/png negro/drive/temp/optmized/shunv35/${fileName.replace(
    ext,
    format
  )}"
    `
  console.log(fee)

  return new Promise((fin, reject) => {
    const dir = exec(
      `ffmpeg -i "${resolve(
        'downloads/' + fileName
      )}" -c:v ${code} -global_quality ${quality} -preset ${preset} -c:s copy -map_chapters 0 -map 0 -c:a copy  "F:/png negro/drive/temp/optmized/shunv35/${fileName.replace(
        ext,
        format
      )}"
        `,
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        }
      }
    )

    dir.on('exit', function (code) {
      fin({
        path: `F:/png negro/drive/temp/optmized/shunv35/${fileName.replace(
          ext,
          format
        )}`
      })
    })
  })
}

async function getVideo(
  fileName: string,
  ext = '.mp4',
  imageName = `${fileName}.avif`
): Promise<{
  info: VideoInfo
  thumb: { path: string }
  video: { path?: string }
}> {
  const { data: videoInfo } = await getInfo(fileName)
  const thumb = await generateThumbLocal(fileName, ext, imageName)
  let info: { data: FileInfo; original: boolean } = {} as any

  let video: { path?: string } = {}
  const large = Math.min(videoInfo.height, videoInfo.width)
  console.log(large, fileName)

  const filePath = `F:/png negro/drive/temp/optmized/shunv35/${fileName.replace(
    ext,
    '.mp4'
  )}`
  const exits = await fileExistsAndHasWeight(filePath)
  if (exits) {
    const newInfo = await getInfo2(basename(filePath ?? ''))
    console.log(
      'ya existe',
      filePath,
      { ...newInfo.data, original: true },
      thumb
    )
    return {
      video: { path: filePath },
      info: { ...newInfo.data, original: true },
      thumb: thumb
    }
  } else {
    if (videoInfo.vibrate < 700) {
      /*
              video = await optimizeBrakeAv1(
                fileName,
                "quality",
                "30",
                "qsv_av1",
                ".mp4",
                ext
              );
      */
      video = await optimizeQsvAv1(
        fileName,
        'veryslow',
        '30',
        'av1_qsv',
        '.mp4',
        ext
      )
      info = {
        ...(await getInfo2(basename(video.path ?? ''))),
        original: false
      }
    } else {
      if (large < 365) {
        if (videoInfo.vibrate < 700) {
          console.log('sin code 365')
          video = { path: resolve('downloads', fileName) }
          info = { data: videoInfo, original: true }
        } else {
          /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "30",
            "qsv_av1",
            ".mp4",
            ext
          );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '30',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          //fs.unlink(resolve('downloads', fileName), () => {})
          console.log('baja 365')
        }
      }

      if (large > 365 && large < 490) {
        if (videoInfo.vibrate < 850) {
          console.log('sin code 490')
          /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "29",
            "qsv_av1",
            ".mp4",
            ext
          );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '29',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          //    fs.unlink(resolve('downloads', fileName), () => {})
        } else {
          console.log('baja 490')
          /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "29",
            "qsv_av1",
            ".mp4",
            ext
          );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '29',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          // fs.unlink(resolve('downloads', fileName), () => {})
        }
      }
      if (large > 490 && large < 650) {
        if (videoInfo.vibrate < 1200) {
          console.log('sin code 650')
          /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "29",
            "qsv_av1",
            ".mp4",
            ext
          );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '25',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          // fs.unlink(resolve('downloads', fileName), () => {})
        } else {
          console.log('baja 650')
          /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "28",
            "qsv_av1",
            ".mp4",
            ext
          );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '25',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          // fs.unlink(resolve('downloads', fileName), () => {})
        }
      }
      if (large > 650 && large < 900) {
        if (videoInfo.vibrate < 1500) {
          console.log('sin code 1500')
          /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "28",
            "qsv_av1",
            ".mp4",
            ext
          );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '25',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          //  fs.unlink(resolve('downloads', fileName), () => {})
        } else {
          console.log('baja 900')
          /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "28",
            "qsv_av1",
            ".mp4",
            ext
          );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '25',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          //fs.unlink(resolve('downloads', fileName), () => {})
        }
      }
      if (large > 900 && large < 1100) {
        console.log('baja 1100')
        /*
        video = await optimizeBrakeAv1(
          fileName,
          "quality",
          "28",
          "qsv_av1",
          ".mp4",
          ext
        );*/
        video = await optimizeQsvAv1(
          fileName,
          'veryslow',
          '25',
          'av1_qsv',
          '.mp4',
          ext
        )
        info = {
          ...(await getInfo2(basename(video.path ?? ''))),
          original: false
        }
        // fs.unlink(resolve('downloads', fileName), () => {})
      }
      if (large > 1100 && large < 1600) {
        console.log('baja h3')
        /*
        video = await optimizeBrakeAv1(
          fileName,
          "quality",
          "30",
          "qsv_av1",
          ".mp4",
          ext
        );*/
        video = await optimizeQsvAv1(
          fileName,
          'veryslow',
          '24',
          'av1_qsv',
          '.mp4',
          ext
        )
        info = {
          ...(await getInfo2(basename(video.path ?? ''))),
          original: false
        }
        //fs.unlink(resolve('downloads', fileName), () => {})
      }

      if (large > 1600) {
        console.log('baja h3')
        /*
        video = await optimizeBrakeAv1(
          fileName,
          "quality",
          "30",
          "qsv_av1",
          ".mp4",
          ext
        );*/
        video = await optimizeQsvAv1(
          fileName,
          'veryslow',
          '23',
          'av1_qsv',
          '.mp4',
          ext
        )
        info = {
          ...(await getInfo2(basename(video.path ?? ''))),
          original: false
        }
        //   fs.unlink(resolve('downloads', fileName), () => {})
      }
      console.log('termina dentro')
    }
  }

  return {
    video: video,
    info: { ...info.data, original: info.original },
    thumb: thumb
  }
}

async function downloader(
  message: LocalMessage,
  index: number,
  currentChat: FolderSelect
) {
  return new Promise(async (resolver, rejct) => {
    if (message.media) {
      try {
        const taskId = createId()
        const { media } = message

        const {
          duration,
          width,
          height,
          fileSize,
          fileName,
          fileId,
          uniqueFileId
        } = media

        const archive = await db.query.files.findFirst({
          where: and(
            eq(files.fileId, fileId.toString()),
            eq(files.duration, `${duration}`),
            eq(files.originalSize, `${fileSize}`)
          )
        })
        const name = fileName
          ? `${fileName.replace(extname(fileName), '')}_${fileSize}${extname(
              fileName
            ).toLowerCase()}`
          : `${fileId.toString()}.mp4`

        if (archive === undefined && duration > 12) {
          console.log('descargando', index, name, fileSize, fileId.toString())
          if (!existsSync(resolve('downloads', name))) {
            await tg.downloadToFile(resolve('downloads', name), fileId)
          }
          const { video, info, thumb } = await getVideo(
            name,
            extname(name).toLowerCase(),
            `${taskId}.avif`
          )
          console.log('Convertido', index, name, fileSize, fileId.toString())

          const [header, grid] = await Promise.all([
            generateThumbLocalWithHeader(
              name,
              video.path ?? '',
              resolve('thumb/header')
            ),
            generateThumbLocalGrid(name, resolve('thumb/grid'))
          ])
          const media = await tg.uploadFile({
            file: video.path ?? '',
            fileSize: info.size
          })
          const thumbv = await tg.uploadFile({ file: grid.path })
          const uploaded: any = await tg.sendMedia(newChatId, {
            file: media,
            type: 'video',
            fileMime: 'video/mp4',
            fileName: name,
            duration: duration,
            width: width,
            height: height,
            supportsStreaming: true,
            thumb: thumbv
          })

          // const originalThumb=` ${chatId}/original/${taskId}.jpg`
          const animatedThumb = `${chatId}/animated/${taskId}.avif`
          const whitHeader = `${chatId}/whitHeader/${taskId}.jpg`
          const gridThumb = `${chatId}/grid/${taskId}.jpg`

          await db.insert(files).values({
            id: taskId,
            name: name,
            chatId: chatId ?? '',
            fileId: fileId,
            folderId: currentChat.id,
            type: 'video',
            messageId: message.id.toString(),
            mimeType: 'video/mp4',
            size: info.size.toString(),
            thumbAnimated: animatedThumb,
            thumbWhitHeader: whitHeader,
            fileReference: `${chatId}/${name}`,
            thumbGrid: gridThumb,
            original: true,
            originalSize: fileSize.toString(),
            info: info,
            duration: duration.toString(),
            newChatId: newChatId.toString(),
            newFileId: uploaded?.media?.fileId,
            newMessageId: uploaded?.id,
            version: 1,
            originalUniqueFileId: uniqueFileId,
            newUniqueFileId: uploaded?.media?.uniqueFileId,
            originalHashFileId: fileId,
            newHashFileId: uploaded?.media?.fileId
          })

          await Promise.all([
            uploadImage(
              animatedThumb,
              readFileSync(thumb.path ?? ''),
              'image/avif'
            ),
            uploadImage(
              whitHeader,
              readFileSync(header.path ?? ''),
              'image/jpeg'
            ),
            uploadImage(gridThumb, readFileSync(grid.path ?? ''), 'image/jpeg')
          ])
          const infoString = JSON.stringify(info, (k, v) =>
            v && typeof v === 'object' ? v : '' + v
          )
          console.log(infoString)

          console.log('convetido', index, name)
          resolver({ status: 'finish' })
        } else {
          console.log('convetido anteriormente', index, name)
          resolver({ status: 'finish' })
        }
      } catch (error: any) {
        console.log('ERROR', index)
        console.log(error)
        resolver({ status: 'error' })
      }
    }
  })
}

async function checkSignedIn() {
  try {
    return await tg.getMe()
  } catch (e) {
    return null
  }
}
function isNumber(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}
