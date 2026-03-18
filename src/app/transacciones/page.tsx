import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TransaccionesClient from './TransaccionesClient'

export default async function TransaccionesPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Obtener conceptos activos del usuario
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

    // Obtener transacciones del mes actual
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

    const transacciones = await prisma.transaction.findMany({
        where: {
            userId: session.user.id,
            date: {
                gte: primerDiaMes,
                lte: ultimoDiaMes
            }
        },
        orderBy: {
            date: 'desc'
        },
        include: {
            concept: true
        }
    })

    // Calcular totales
    const totalIngresos = transacciones
        .filter(t => t.type === 'INGRESO')
        .reduce((sum, t) => sum + t.value, 0)

    const totalGastos = transacciones
        .filter(t => t.type === 'GASTO')
        .reduce((sum, t) => sum + t.value, 0)

    return (
        <TransaccionesClient
            conceptos={conceptos}
            transacciones={transacciones}
            totalIngresos={totalIngresos}
            totalGastos={totalGastos}
        />
    )
}