import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        // 1. Parsear el body correctamente
        const body = await request.json()
        console.log('Body recibido:', body)

        // 2. Extraer los datos
        const { name, email, password } = body

        // 3. Validaciones básicas
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email requerido' },
                { status: 400 }
            )
        }

        if (!password || typeof password !== 'string') {
            return NextResponse.json(
                { error: 'Contraseña requerida' },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            )
        }

        // 4. Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() } // Normalizar email
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'El email ya está registrado' },
                { status: 400 }
            )
        }

        // 5. Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10)

        // 6. Crear usuario
        const user = await prisma.user.create({
            data: {
                name: name || null,
                email: email.toLowerCase(),
                password: hashedPassword
            }
        })

        console.log('Usuario creado:', user.id)

        return NextResponse.json({
            success: true,
            user: { id: user.id, email: user.email }
        })

    } catch (error: any) {
        console.error('Error detallado:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        })

        return NextResponse.json(
            { error: 'Error al crear usuario: ' + error.message },
            { status: 500 }
        )
    }
}