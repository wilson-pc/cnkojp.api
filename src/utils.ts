import { init } from '@paralleldrive/cuid2'
import { statSync, unlinkSync } from 'fs'

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function isNumeric(value: string) {
  return /^-?\d+$/.test(value)
}

export const createCustomId = init({
  // A custom random function with the same API as Math.random.
  // You can use this to pass a cryptographically secure random function.
  random: Math.random,
  // the length of the id
  length: 4,
  // A custom fingerprint for the host environment. This is used to help
  // prevent collisions when generating ids in a distributed system.
  fingerprint: 'qfqwegwe'
})

export async function fileExistsAndHasWeight(filePath: string) {
  try {
    const stats = await statSync(filePath) // Obtiene información del archivo
    if (!stats.isFile()) {
      console.log('El path no es un archivo.')
      return false
    }

    if (stats.size === 0) {
      // Si el archivo está vacío, se elimina
      await unlinkSync(filePath)
      console.log(`Archivo vacío eliminado: ${filePath}`)
      return false // No tiene contenido
    }

    return true
  } catch (error: any) {
    console.log("qwfeqwwefqwegjq34e90ghhj3489ghj3948tfhj3489th3498")
  

    return false
  }
}
 
export function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}


export const customSelect = (fields: string[]) => {
  const select: Record<string, boolean> = {}

  for (let index = 0; index < fields.length; index++) {
      const element = fields[index];
      select[element] = true

  }

  return select as any
}