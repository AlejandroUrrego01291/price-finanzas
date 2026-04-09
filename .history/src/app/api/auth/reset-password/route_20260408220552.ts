import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        const { token, newPassword } = await request.json()

        if (!token || !newPassword) {
            return NextResponse.json(
                { error: 'Token y nueva contraseña son requeridos' },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            )
        }

        // Buscar token válido
        const resetToken = await prisma.passwordResetToken.findFirst({
            where: {
                token,
                used: false,
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                user: true
            }
        })

        if (!resetToken) {
            return NextResponse.json(
                { error: 'El enlace ha expirado o no es válido' },
                { status: 400 }
            )
        }

        // Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Actualizar la contraseña del usuario
        await prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedPassword }
        })

        // Marcar el token como usado
        await prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { used: true }
        })

        return NextResponse.json({
            message: 'Contraseña actualizada correctamente'
        })
    } catch (error) {
        console.error('Error en reset-password:', error)
        return NextResponse.json(
            { error: 'Error al restablecer la contraseña' },
            { status: 500 }
        )
    }
}