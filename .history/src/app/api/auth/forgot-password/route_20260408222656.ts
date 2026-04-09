import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json(
                { error: 'El correo es requerido' },
                { status: 400 }
            )
        }

        // Buscar usuario (sin exponer si existe o no)
        const user = await prisma.user.findUnique({
            where: { email }
        })

        // Siempre respondemos éxito por seguridad (no exponer si el correo existe)
        if (!user) {
            return NextResponse.json({
                message: 'Si el correo existe, recibirás un enlace de recuperación'
            })
        }

        // Eliminar tokens anteriores no usados
        await prisma.PasswordResetToken.deleteMany({
            where: {
                userId: user.id,
                used: false
            }
        })

        // Generar token único
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 1) // Expira en 1 hora

        // Guardar token en la base de datos
        await prisma.passwordResetToken.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
                used: false
            }
        })

        // Construir enlace de recuperación
        const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

        // Enviar correo
        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: email,
                subject: 'Recupera tu contraseña - Mis Finanzas',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #3B82F6;">Mis Finanzas</h1>
                        <p>Hola, ${user.name || 'usuario'}!</p>
                        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
                        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                            Restablecer contraseña
                        </a>
                        <p>Este enlace expirará en <strong>1 hora</strong>.</p>
                        <p>Si no solicitaste este cambio, ignora este correo.</p>
                        <hr style="margin: 20px 0;" />
                        <p style="color: #666; font-size: 12px;">© 2024 Mis Finanzas - Todos los derechos reservados</p>
                    </div>
                `
            })
        } catch (emailError) {
            console.error('Error al enviar correo:', emailError)
            // No fallamos la petición si el correo falla, solo logueamos
        }

        return NextResponse.json({
            message: 'Si el correo existe, recibirás un enlace de recuperación'
        })

    } catch (error) {
        console.error('Error en forgot-password:', error)
        return NextResponse.json(
            { error: 'Error al procesar la solicitud' },
            { status: 500 }
        )
    }
}