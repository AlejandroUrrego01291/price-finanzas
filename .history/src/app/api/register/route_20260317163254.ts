import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        // 1. Obtener los datos como texto plano primero
        const body = await request.text()
        console.log('📦 Body recibido:', body)

        // 2. Parsear JSON manualmente
        let name, email, password
        try {
            const parsed = JSON.parse(body)
            name = parsed.name
            email = parsed.email
            password = parsed.password
        } catch (e) {
            console.error('❌ Error parseando JSON:', e)
            return NextResponse.json(
                { error: 'Formato de datos inválido' },
                { status: 400 }
            )
        }

        // 3. Validaciones estrictas
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email requerido y debe ser texto' },
                { status: 400 }
            )
        }

        if (!password || typeof password !== 'string') {
            return NextResponse.json(
                { error: 'Contraseña requerida y debe ser texto' },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            )
        }

        // 4. Validar email con regex básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Email inválido' },
                { status: 400 }
            )
        }

        console.log('✅ Datos validados:', { email, name: name || 'sin nombre' })

        // 5. Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'El email ya está registrado' },
                { status: 400 }
            )
        }

        // 6. Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10)

        // 7. Crear usuario
        const user = await prisma.user.create({
            data: {
                name: name || null, // Si no hay nombre, guardar null
                email,
                password: hashedPassword
            }
        })

        console.log('✅ Usuario creado:', user.id)

        return NextResponse.json({
            success: true,
            user: { id: user.id, email: user.email }
        })

    } catch (error) {
        console.error('❌ Error detallado:', error)
        return NextResponse.json(
            { error: 'Error al crear usuario' },
            { status: 500 }
        )
    }
}