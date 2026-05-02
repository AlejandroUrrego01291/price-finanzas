import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ConceptosClient from './ConceptosClient'
import NavBar from '@/components/NavBar'

export default async function ConceptosPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

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

    return (
        <>
            <NavBar titulo="Administrar Conceptos" showBackButton={true} />
            <ConceptosClient conceptos={conceptos} />
        </>
    )
}