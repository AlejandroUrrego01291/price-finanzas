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

    // Obtener transacciones para los gráficos
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

    // Convertir fechas
    const transacciones = transaccionesDB.map(t => ({
        ...t,
        date: t.date.toISOString().split('T')[0],
        concept: t.concept ? {
            ...t.concept,
            fixedDate: t.concept.fixedDate,
            value: t.concept.value
        } : null
    }))

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
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Navbar */}
                <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-20 items-center">
                            <div className="flex items-center">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Price
                                </h1>
                                <span className="ml-3 text-sm font-medium text-gray-600 hidden md:inline-block">
                                    Dashboard
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Link href="/conceptos" className="px-4 py-2 text-gray-700 font-medium rounded-full hover:bg-green-50 hover:text-green-600 transition-all duration-300">
                                    <span className="flex items-center space-x-1">
                                        <span>📁</span>
                                        <span>Conceptos</span>
                                    </span>
                                </Link>
                                <Link href="/transacciones" className="px-4 py-2 text-gray-700 font-medium rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-300">
                                    <span className="flex items-center space-x-1">
                                        <span>💰</span>
                                        <span>Transacciones</span>
                                    </span>
                                </Link>
                                <Link href="/deudas" className="px-4 py-2 text-gray-700 font-medium rounded-full hover:bg-red-50 hover:text-red-600 transition-all duration-300">
                                    <span className="flex items-center space-x-1">
                                        <span>💳</span>
                                        <span>Deudas</span>
                                    </span>
                                </Link>
                                <Link href="/ahorros" className="px-4 py-2 text-gray-700 font-medium rounded-full hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300">
                                    <span className="flex items-center space-x-1">
                                        <span>🐷</span>
                                        <span>Ahorros</span>
                                    </span>
                                </Link>
                                <Link href="/predicciones" className="px-4 py-2 text-gray-700 font-medium rounded-full hover:bg-purple-50 hover:text-purple-600 transition-all duration-300">
                                    <span className="flex items-center space-x-1">
                                        <span>🔮</span>
                                        <span>Predicciones</span>
                                    </span>
                                </Link>
                            </div>
                            <div className="flex items-center">
                                <Link
                                    href="/api/auth/signout"
                                    className="px-5 py-2.5 text-sm font-medium text-red-600 hover:text-white border-2 border-red-600 rounded-full hover:bg-red-600 transition-all duration-300"
                                >
                                    Cerrar sesión
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto py-12 px-4">
                    <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">¡Mis finanzas personales!</h2>
                        <p className="text-gray-600 mb-8">Comienza registrando tus primeras transacciones para ver los gráficos</p>
                        <div className="flex justify-center space-x-4">
                            <Link href="/transacciones" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition">
                                Ir a Transacciones
                            </Link>
                            <Link href="/conceptos" className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition">
                                Configurar Conceptos
                            </Link>
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