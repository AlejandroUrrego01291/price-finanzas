'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [error, setError] = useState('')
    const [tokenValido, setTokenValido] = useState<boolean | null>(null)

    // Verificar token al cargar
    useEffect(() => {
        if (!token) {
            setTokenValido(false)
            setError('Token no válido o expirado')
            return
        }

        const verificarToken = async () => {
            try {
                const response = await fetch(`/api/auth/verify-reset-token?token=${token}`)
                if (response.ok) {
                    setTokenValido(true)
                } else {
                    setTokenValido(false)
                    setError('El enlace ha expirado o no es válido')
                }
            } catch (error) {
                setTokenValido(false)
                setError('Error al verificar el token')
            }
        }

        verificarToken()
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setLoading(true)
        setMensaje('')
        setError('')

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            })

            const data = await response.json()

            if (response.ok) {
                setMensaje('Contraseña actualizada correctamente. Redirigiendo al login...')
                setTimeout(() => {
                    router.push('/login')
                }, 3000)
            } else {
                setError(data.error || 'Error al restablecer la contraseña')
            }
        } catch (error) {
            setError('Error de conexión al servidor')
        } finally {
            setLoading(false)
        }
    }

    if (tokenValido === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verificando enlace...</p>
                </div>
            </div>
        )
    }

    if (tokenValido === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl text-center">
                    <div className="text-red-500 text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-800">Enlace inválido o expirado</h2>
                    <p className="text-gray-600 mb-6">El enlace de recuperación ha expirado o no es válido.</p>
                    <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500">
                        Solicitar nuevo enlace →
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Nueva contraseña
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Ingresa tu nueva contraseña
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {mensaje && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                            {mensaje}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Nueva contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirmar contraseña
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {loading ? 'Actualizando...' : 'Restablecer contraseña'}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
                            ← Volver al inicio de sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}