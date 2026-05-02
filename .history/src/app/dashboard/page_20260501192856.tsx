import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Obtener el nombre del usuario de la base de datos (asegurar que está)
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true }
    })

    // Extraer el primer nombre
    const primerNombre = user?.name?.split(' ')[0] || 'Usuario'

    // Obtener todas las transacciones del usuario
    const transaccionesDB = await prisma.transaction.findMany({
        where: {
            userId: session.user.id
        },
        orderBy: {
            date: 'desc'
        },
        include: {
            concept: true
        }
    })

    // Dentro del map de transaccionesDB, modifica la conversión de fecha:
    const transacciones = transaccionesDB.map(t => ({
        id: t.id,
        type: t.type,
        conceptName: t.conceptName,
        value: t.value,
        // 🔥 CORRECCIÓN: Mantener la fecha UTC para el frontend
        date: t.date.toISOString().split('T')[0],
        category: t.category,
        subType: t.subType,
        completed: t.completed,
        userId: t.userId,
        conceptId: t.conceptId,
        createdAt: t.createdAt,
        concept: t.concept ? {
            id: t.concept.id,
            name: t.concept.name,
            type: t.concept.type,
            category: t.concept.category,
            subType: t.concept.subType,
            value: t.concept.value,
            fixedDate: t.concept.fixedDate,
            createdAt: t.concept.createdAt,
            updatedAt: t.concept.updatedAt,
            userId: t.concept.userId,
            isActive: t.concept.isActive
        } : null
    }))

    // Obtener meses disponibles
    const mesesDisponibles = Array.from(new Set(
        transacciones.map(t => {
            const fecha = new Date(t.date)
            return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
        })
    )).sort().reverse()

    // Si no hay transacciones, mostrar mensaje con el nombre
    if (transacciones.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-20 items-center">
                            <div className="flex items-center">
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Mis finanzas
                                </h1>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="text-body">{session.user?.email}</span>
                                <a href="/api/auth/signout" className="text-red-600 hover:text-red-800">Cerrar sesión</a>
                            </div>
                        </div>
                    </div>
                </nav>
                <main className="max-w-7xl mx-auto py-12 px-4">
                    <div className="bg-white shadow rounded-lg p-12 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            ¡Hola, {primerNombre}! 👋
                        </h2>
                        <p className="text-gray-600 mb-8">Comienza registrando tus transacciones para ver los gráficos</p>
                        <div className="flex justify-center space-x-4">
                            <a href="/transacciones" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Ir a Transacciones
                            </a>
                            <a href="/conceptos" className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                                Configurar Conceptos
                            </a>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <DashboardClient
            transacciones={transacciones}
            mesesDisponibles={mesesDisponibles}
            primerNombre={primerNombre}
        />
    )
}