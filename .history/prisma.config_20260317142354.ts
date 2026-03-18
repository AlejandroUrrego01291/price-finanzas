import { defineConfig } from 'prisma/config'
import 'dotenv/config'

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
    shadowDatabaseUrl: process.env.POSTGRES_URL_NON_POOLING,
  },
})