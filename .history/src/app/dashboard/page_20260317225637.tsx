import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Obtener todas las transacciones del usuario
    const transacciones = await prisma.transaction.findMany({
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

    // Obtener meses disponibles
    const mesesDisponibles = Array.from(new Set(
        transacciones.map(t => {
            const fecha = new Date(t.date)
            return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
        })
    )).sort().reverse()

    // Si no hay transacciones, mostrar mensaje
    if (transacciones.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50">
                <nav className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex items-center">
                                <h1 className="text-title text-xl">Price - Dashboard Financiero</h1>
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Bienvenido a Price</h2>
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
        />
    )
}