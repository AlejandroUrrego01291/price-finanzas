import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña requeridos' },
                { status: 400 }
            )
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'El email ya está registrado' },
                { status: 400 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword
            }
        })

        return NextResponse.json({
            success: true,
            user: { id: user.id, email: user.email }
        })
    } catch (error) {
        console.error('Error en registro:', error)
        return NextResponse.json(
            { error: 'Error al crear usuario' },
            { status: 500 }
        )
    }
}