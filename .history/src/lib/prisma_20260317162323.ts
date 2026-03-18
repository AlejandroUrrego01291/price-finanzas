import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Verificar que la URL existe
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
    console.error('❌ DATABASE_URL no está definida')
} else {
    console.log('✅ Conectando a DB:', databaseUrl.substring(0, 50) + '...')
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma