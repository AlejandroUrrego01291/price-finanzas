import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Usar la URL directamente para probar (REEMPLAZA CON TU URL REAL)
const DATABASE_URL = "postgresql://neondb_owner:npg_vSYtKX67esqL@ep-mute-morning-anzmwq41-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasourceUrl: DATABASE_URL, // Opción correcta en Prisma 7
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma