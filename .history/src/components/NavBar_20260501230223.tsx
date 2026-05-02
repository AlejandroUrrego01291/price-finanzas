'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

type NavBarProps = {
    titulo: string
    showBackButton?: boolean
}

export default function NavBar({ titulo, showBackButton = true }: NavBarProps) {
    const router = useRouter()

    return (
        <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">

                {/* 🔥 VERSIÓN MÓVIL (menos de 640px) */}
                <div className="flex flex-col sm:hidden py-2">
                    {/* Fila superior: Logo y botón Volver */}
                    <div className="flex justify-between items-center">
                        <Link
                            href="/dashboard"
                            className="flex items-center space-x-2"
                            title="Ir al Dashboard"
                        >
                            <span className="text-xl">💰</span>
                            <span className="text-base font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Mis finanzas
                            </span>
                        </Link>

                        {showBackButton && (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 transition-all"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span>Volver</span>
                            </button>
                        )}
                    </div>

                    {/* Fila inferior: Título de la sección centrado */}
                    <div className="flex justify-center mt-1">
                        <h2 className="text-sm font-semibold text-gray-700 bg-gray-100 px-4 py-1 rounded-full">
                            {titulo}
                        </h2>
                    </div>
                </div>

                {/* 🔥 VERSIÓN ESCRITORIO/TABLET (más de 640px) */}
                <div className="hidden sm:flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link
                        href="/dashboard"
                        className="flex items-center space-x-3 group shrink-0"
                        title="Ir al Dashboard"
                    >
                        <span className="text-2xl md:text-3xl">💰</span>
                        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                            Mis finanzas
                        </h1>
                    </Link>

                    {/* Título centrado */}
                    <div className="absolute left-1/2 transform -translate-x-1/2">
                        <div className="flex flex-col items-center justify-center">
                            <h2 className="text-base md:text-xl lg:text-2xl font-extrabold tracking-tight">
                                <span className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent">
                                    {titulo}
                                </span>
                            </h2>
                            <div className="w-10 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-1"></div>
                        </div>
                    </div>

                    {/* Botón Volver */}
                    <div className="flex items-center shrink-0">
                        {showBackButton && (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="group relative flex items-center justify-center px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-medium text-gray-700 hover:text-white border-2 border-gray-300 rounded-full hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 hover:border-gray-600 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg overflow-hidden"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                                <span className="relative flex items-center space-x-2">
                                    <svg className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span className="hidden sm:inline">Volver</span>
                                </span>
                            </button>
                        )}
                        {!showBackButton && <div className="w-20 md:w-28"></div>}
                    </div>
                </div>
            </div>
        </nav>
    )
}