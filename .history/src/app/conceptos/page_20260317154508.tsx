import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ConceptosClient from './ConceptosClient'

export default async function ConceptosPage() {
    const session = await getServerSession()

    if (!session?.user?.id) {
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
}