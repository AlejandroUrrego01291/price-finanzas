import { PrismaClient } from '@prisma/client'

// Cargar variables de entorno explícitamente
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Verificar que la URL existe y mostrar diagnóstico
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL

if (!databaseUrl) {
    console.error('===========================================')
    console.error('❌ ERROR CRÍTICO: Variable de base de datos no encontrada')
    console.error('📁 Archivo .env.local debe contener:')
    console.error('   POSTGRES_URL="postgresql://..."')
    console.error('   O DATABASE_URL="postgresql://..."')
    console.error('===========================================')
    console.error('Variables disponibles:', Object.keys(process.env).filter(key =>
        key.includes('POSTGRES') || key.includes('DATABASE')
    ))
} else {
    console.log('✅ Base de datos URL encontrada:', databaseUrl.substring(0, 50) + '...')
}

// Configurar Prisma Client con opciones explícitas para Prisma 7
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    // En Prisma 7, la configuración se hace a través de estas opciones
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    // La URL se toma automáticamente de DATABASE_URL o de la configuración en prisma.config.ts
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma