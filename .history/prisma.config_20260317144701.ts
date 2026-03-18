import { defineConfig } from 'prisma/config'

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
    shadowDatabaseUrl: "postgresql://neondb_owner:npg_vSYtKX67esqL@ep-mute-morning-anzmwq41.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
  },
})