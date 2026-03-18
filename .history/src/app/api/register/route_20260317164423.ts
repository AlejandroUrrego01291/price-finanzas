import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        // 1. Parsear el body
        const body = await request.json()
        console.log('📦 Body recibido:', body)

        // 2. Extraer y validar
        const { name, email, password } = body

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
        }

        if (!password || typeof password !== 'string') {
            return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
        }

        // 3. Verificar si existe
        console.log('🔍 Buscando usuario:', email)
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'Email ya registrado' }, { status: 400 })
        }

        // 4. Crear usuario
        console.log('🔐 Encriptando contraseña...')
        const hashedPassword = await bcrypt.hash(password, 10)

        console.log('💾 Creando usuario...')
        const user = await prisma.user.create({
            data: {
                name: name || null,
                email,
                password: hashedPassword
            }
        })

        console.log('✅ Usuario creado:', user.id)
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('❌ Error completo:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        })

        return NextResponse.json(
            { error: 'Error interno: ' + error.message },
            { status: 500 }
        )
    }
}