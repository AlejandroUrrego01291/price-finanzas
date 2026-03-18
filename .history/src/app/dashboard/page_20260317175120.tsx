import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
    const session = await getServerSession()

    if (!session?.user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">Price - Dashboard</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">
                                {session.user?.email}
                            </span>
                            <Link
                                href="/api/auth/signout"
                                className="text-sm text-red-600 hover:text-red-800"
                            >
                                Cerrar sesión
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
                        <h2 className="text-2xl font-bold mb-4">
                            Bienvenido, {session.user?.email}
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Este es tu panel financiero. Comienza configurando tus conceptos:
                        </p>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Link href="/conceptos"
                                className="block p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">📁 Configurar Conceptos</h3>
                                <p className="text-gray-600">Administra los conceptos de ingresos y gastos</p>
                            </Link>

                            <div className="block p-6 bg-white rounded-lg border border-gray-200 opacity-50">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">💰 Registrar Transacciones</h3>
                                <p className="text-gray-600">Próximamente...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}