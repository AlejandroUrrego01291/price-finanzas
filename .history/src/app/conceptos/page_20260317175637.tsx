import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ConceptosClient from './ConceptosClient'

export default async function ConceptosPage() {
    console.log('🔍 Verificando sesión en conceptos...')

    try {
        const session = await getServerSession()

        console.log('📦 Sesión obtenida:', session ? 'Sí' : 'No')
        console.log('👤 Usuario ID:', session?.user?.id || 'No disponible')

        if (!session?.user?.id) {
            console.log('⛔ No hay sesión, redirigiendo a login...')
            redirect('/login')
        }

        console.log('✅ Sesión válida, cargando conceptos...')

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