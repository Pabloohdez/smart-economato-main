const API_URL = 'http://localhost:4000'

export const AuthService = {
  async login(username, password) {
    try {
        // Buscamos el usuario en el json-server coincidiendo usuario y contraseña
        const res = await fetch(`${API_URL}/usuarios?username=${username}&password=${password}`);
        
        if (!res.ok) return null;
        
        const users = await res.json();
        
        // Si devuelve algún usuario, el login es correcto
        if (users.length > 0) {
            return users[0];
        }
        return null;

    } catch (e) {
        console.error("Login error:", e);
        return null;
    }
  }
};


