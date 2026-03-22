// Modificar el tipo Props
type Props = {
    transacciones: Transaccion[]
    mesesDisponibles: string[]
    primerNombre: string  // ← NUEVO
}

// En la función principal, agregar el parámetro
export default function DashboardClient({
    transacciones,
    mesesDisponibles,
    primerNombre  // ← NUEVO
}: Props) {

    // En el JSX, dentro del main, antes del selector de fecha, agregar:
    <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            ¡Hola, {primerNombre}! 👋
        </h2>
        <p className="text-gray-600 mt-1">Aquí tienes un resumen de tus finanzas</p>
    </div>