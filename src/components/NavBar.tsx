'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

type NavBarProps = {
    titulo: string          // "Transacciones", "Conceptos", etc.
    showBackButton?: boolean // Si se muestra el botón "Volver"
}

export default function NavBar({ titulo, showBackButton = true }: NavBarProps) {
    const router = useRouter()

    return (
        <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    {/* Logo con hipervínculo al Dashboard */}
                    <Link
                        href="/dashboard"
                        className="flex items-center space-x-3 group"
                        title="Ir al Dashboard"
                    >
                        <span className="text-3xl">💰</span>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                            Mis finanzas
                        </h1>
                        <span className="text-xs text-gray-400 hidden sm:inline-block ml-1">(Inicio)</span>
                    </Link>

                    {/* Título de la sección actual y botón Volver */}
                    <div className="flex items-center space-x-4">
                        {titulo && (
                            <span className="text-sm font-medium text-gray-600 hidden md:inline-block">
                                {titulo}
                            </span>
                        )}

                        {showBackButton && (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="group relative flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-white border-2 border-gray-300 rounded-full hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 hover:border-gray-600 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg overflow-hidden"
                            >
                                {/* Efecto de fondo animado */}
                                <span className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>

                                {/* Contenido del botón */}
                                <span className="relative flex items-center space-x-2">
                                    <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span className="hidden sm:inline">Volver al Dashboard</span>
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}