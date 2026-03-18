import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Crear conexión con Neon
const connectionString = process.env.POSTGRES_URL!

if (!connectionString) {
    throw new Error('POSTGRES_URL no está definida')
}

console.log('✅ Conectando a Neon DB:', connectionString.substring(0, 50) + '...')

// Configurar el adapter de Neon
const pool = new Pool({ connectionString })
const adapter = new PrismaNeon(pool)

// Crear el cliente con el adapter
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma