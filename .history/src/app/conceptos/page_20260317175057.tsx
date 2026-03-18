import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ConceptosClient from './ConceptosClient'

export default async function ConceptosPage() {
    try {
        const session = await getServerSession()

        // Verificar si hay sesión
        if (!session?.user?.id) {
            console.log('No hay sesión, redirigiendo a login...')
            redirect('/login')
        }

        // Obtener los conceptos del usuario desde la base de datos
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

        return <ConceptosClient conceptos={conceptos} />

    } catch (error) {
        console.error('Error en ConceptosPage:', error)
        redirect('/login')
    }
}