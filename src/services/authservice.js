const API_URL = './api';

export const AuthService = {
    async login(username, password) {
        try {
            // Hacer petición POST a login.php (API PHP)
            const res = await fetch(`${API_URL}/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest' // Importante para pasar validación AJAX si la hay
                },
                body: JSON.stringify({ username, password })
            });

            // Si el servidor responde pero con error (401, 400, etc.)
            if (!res.ok) {
                const errorData = await res.json();
                console.error("Error de autenticación:", errorData);
                return null;
            }

            // Parsear respuesta JSON
            const response = await res.json();

            // La API devuelve { success: true, data: { user } }
            if (response.success && response.data) {
                return response.data;
            }

            return null;

        } catch (e) {
            console.error("Login error:", e);
            return null;
        }
    }
};
