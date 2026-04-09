import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json(
                { error: 'Token requerido' },
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
                { error: 'Token inválido o expirado' },
                { status: 400 }
            )
        }

        return NextResponse.json({ valid: true })
    } catch (error) {
        console.error('Error en verify-reset-token:', error)
        return NextResponse.json(
            { error: 'Error al verificar token' },
            { status: 500 }
        )
    }
}