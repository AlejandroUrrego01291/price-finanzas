import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Forzar la carga del archivo .env.local
config({ path: '.env.local' })

export default defineConfig({
  earlyAccessFeatures: {
    driverAdapters: {
      neon: true,
    },
  },
  schema: './prisma/schema.prisma',
  output: './node_modules/@prisma/client',
  datasource: {
    url: "postgresql://neondb_owner:npg_vSYtKX67esqL@ep-mute-morning-anzmwq41-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
    shadowDatabaseUrl: process.env.POSTGRES_URL_NON_POOLING,
  },
})