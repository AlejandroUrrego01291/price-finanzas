import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Cargar variables de entorno desde .env.local
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
    url: process.env.POSTGRES_URL!,
    shadowDatabaseUrl: process.env.POSTGRES_URL_NON_POOLING!,
  },
})