const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
        // Verificar que los datos son strings
        console.log('📤 Enviando:', { name, email, password })

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name || '',
                email: email.trim(),
                password: password
            })
        })

        const data = await response.json()
        console.log('📥 Respuesta:', data)

        if (response.ok) {
            router.push('/login?registered=true')
        } else {
            setError(data.error || 'Error al registrar')
        }
    } catch (error) {
        console.error('❌ Error en fetch:', error)
        setError('Ocurrió un error al conectar con el servidor')
    } finally {
        setLoading(false)
    }
}