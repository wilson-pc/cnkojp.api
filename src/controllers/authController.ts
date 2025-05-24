import { decode, sign, verify } from 'hono/jwt'
import { validator } from 'hono/validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createMiddleware } from 'hono/factory'
import { jwtPayload } from '../types'
import { credentials, secret } from '../constants'
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

const app = new Hono<{
  Variables: {
    jwtPayload: jwtPayload
    lang: string
  }
}>()

const echoMiddleware = createMiddleware<{
  Variables: {
    jwtPayload: jwtPayload
    lang: string
  }
}>(async (c, next) => {
  const path = c.req.url
  if (path.includes('/auth/login')) {
    await next()
  } else {
    const token = c.req.header('Authorization')?.split(' ')[1]
    if (token) {
     try {
      const decodedPayload = await verify(token, secret)
      c.set('jwtPayload', decodedPayload as jwtPayload)
     } catch (error) {
      return c.json({message: 'token invalid'}, 401)
     }
    }
    await next()
  }
})

app.use(echoMiddleware)

app.post(
  '/login',
  validator('json', (value, c) => {
    const parsed = loginSchema.safeParse(value)
    if (!parsed.success) {
      return c.json({message: 'user or password invalid'}, 401)
    }
    return { ...parsed.data }
  }),
  async (c) => {
    const query = c.req.valid('json')
    if (
      query.email !== credentials.email ||
      query.password !== credentials.password
    ) {
      return c.json({message: 'user or password invalid'}, 401)
    }

    const payload: jwtPayload = {
      sub: 'user123',
      email: credentials.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 5 // Token expires in 5 minutes
    }

    const token = await sign(payload, secret, 'HS256')

    return c.json({ token })
  }
)

app.get('/verify', async (c) => {
  const jwtPayload = c.var.jwtPayload
  return c.json({ status: true,email:jwtPayload.email })
})

export const authController = app
