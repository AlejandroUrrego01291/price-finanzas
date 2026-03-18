import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Verificar que la URL existe
if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL no está definida en las variables de entorno')
}

console.log('🔌 Conectando a DB:', process.env.POSTGRES_URL?.substring(0, 50) + '...')

// En Prisma 7, la URL se toma automáticamente de process.env.DATABASE_URL
// Pero podemos asegurarnos de que esté configurada correctamente
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma