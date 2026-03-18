import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Crear el cliente con opciones explícitas
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasources: {
        db: {
            url: process.env.POSTGRES_URL,
        },
    },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma