import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Verificar que la URL existe
const databaseUrl = process.env.POSTGRES_URL

if (!databaseUrl) {
    console.error('❌ POSTGRES_URL no está definida')
    throw new Error('POSTGRES_URL no está definida')
}

console.log('✅ Conectando a DB:', databaseUrl.substring(0, 50) + '...')

// Versión simple de Prisma Client
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
    log: ['query', 'info', 'warn', 'error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma