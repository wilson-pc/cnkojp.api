// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import 'dotenv/config'

export default defineConfig({
  dialect: "turso",
  schema: "./src/schema/*",
  
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
  },
});