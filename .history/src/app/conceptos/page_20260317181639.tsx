import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ConceptosClient from './ConceptosClient'

export default async function ConceptosPage() {
    console.log('🔍 Verificando sesión en conceptos...')

    try {
        const session = await getServerSession()

        console.log('📦 Sesión completa:', JSON.stringify(session, null, 2))

        if (!session) {
            console.log('⛔ No hay sesión en absoluto')
            redirect('/login')
        }

        if (!session.user?.id) {
            console.log('⛔ La sesión no tiene user.id')
            console.log('Estructura de session.user:', session.user)
            redirect('/login')
        }

        console.log('✅ Sesión válida para usuario:', session.user.id)

        const conceptos = await prisma.concept.findMany({
            where: {
                userId: session.user.id,
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