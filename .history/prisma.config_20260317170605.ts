import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Forzar la carga de .env.local
config({ path: '.env.local' })

export default defineConfig({
  schema: './prisma/schema.prisma',
})