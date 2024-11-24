import { TelegramClient } from "telegram"

export type Env = {
    Variables: {
    telegram:TelegramClient
    },

  }

  export type jwtPayload = {
    sub: string
    email: string
    exp: number
  }