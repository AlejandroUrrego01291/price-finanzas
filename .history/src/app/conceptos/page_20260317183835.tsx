import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import ConceptosClient from './ConceptosClient'
import { cookies } from 'next/headers'
import { decode } from 'next-auth/jwt'

export default async function ConceptosPage() {
    console.log('🔍 Verificando sesión en conceptos...')

    try {
        const session = await getServerSession(authOptions)

        console.log('📦 Sesión de getServerSession:', session)

        // Intentar obtener el ID directamente del token
        let userId = session?.user?.id

        // Si no hay ID en la sesión, intentar decodificar el token
        if (!userId) {
            console.log('⚠️ ID no encontrado en sesión, intentando con token...')
            const cookieStore = cookies()
            const tokenCookie = cookieStore.get('next-auth.session-token')

            if (tokenCookie) {
                try {
                    const decoded = await decode({
                        token: tokenCookie.value,
                        secret: process.env.NEXTAUTH_SECRET!,
                    })
                    userId = decoded?.id as string
                    console.log('✅ ID obtenido del token:', userId)
                } catch (e) {
                    console.error('Error decodificando token:', e)
                }
            }
        }

        if (!userId) {
            console.log('⛔ No se pudo obtener el ID del usuario')
            redirect('/login')
        }

        console.log('✅ Usuario ID válido:', userId)

        const conceptos = await prisma.concept.findMany({
            where: {
                userId: userId,
                isActive: true
            },
            orderBy: [
                { type: 'asc' },
                { name: 'asc' }
            ]
        })

        console.log(`📊 Conceptos cargados: ${conceptos.length}`)
        return <ConceptosClient conceptos={conceptos} />

    } catch (error) {
        console.error('❌ Error en ConceptosPage:', error)
        redirect('/login')
    }
}