import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center">
          {/* Logo o título principal */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Mis Finanzas
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Controla tus ingresos, gastos, deudas y ahorros en un solo lugar.
            Toma el control de tu futuro financiero hoy mismo.
          </p>

          {/* Botones de acción principales */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg text-lg font-semibold"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all transform hover:scale-105 shadow-lg border-2 border-gray-200 text-lg font-semibold"
            >
              Crear Cuenta Gratis
            </Link>
          </div>

          {/* Características */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-16">
            <div className="bg-white/80 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
              <div className="text-4xl md:text-5xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Control Total</h3>
              <p className="text-gray-600 text-sm md:text-base">
                Registra y categoriza todos tus ingresos y gastos de forma sencilla
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
              <div className="text-4xl md:text-5xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Dashboard Visual</h3>
              <p className="text-gray-600 text-sm md:text-base">
                Gráficos interactivos que te ayudan a entender tus finanzas
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
              <div className="text-4xl md:text-5xl mb-4">🔮</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Predicciones</h3>
              <p className="text-gray-600 text-sm md:text-base">
                Proyecta tu futuro financiero y toma mejores decisiones
              </p>
            </div>
          </div>

          {/* Stats o información adicional */}
          <div className="mt-16 md:mt-20">
            <div className="inline-flex flex-wrap justify-center gap-4 md:gap-8 p-6 md:p-8 bg-white/50 backdrop-blur-sm rounded-3xl">
              <div className="text-center px-4">
                <div className="text-2xl md:text-3xl font-bold text-blue-600">+1000</div>
                <div className="text-xs md:text-sm text-gray-600">Usuarios activos</div>
              </div>
              <div className="w-px h-12 bg-gray-300 hidden md:block"></div>
              <div className="text-center px-4">
                <div className="text-2xl md:text-3xl font-bold text-purple-600">+5000</div>
                <div className="text-xs md:text-sm text-gray-600">Registrar nueva Transacción</div>
              </div>
              <div className="w-px h-12 bg-gray-300 hidden md:block"></div>
              <div className="text-center px-4">
                <div className="text-2xl md:text-3xl font-bold text-pink-600">100%</div>
                <div className="text-xs md:text-sm text-gray-600">Seguro y privado</div>
              </div>
            </div>
          </div>

          {/* Footer simple */}
          <div className="mt-16 md:mt-20 text-xs md:text-sm text-gray-500">
            HAUM © 2026 Mis Finanzas. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  )
}