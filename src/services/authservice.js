const API_URL = 'http://localhost:4000'

export const AuthService = {
  async login(username, password) {
    try {
        const res = await fetch(`http://localhost/smart-economato-main-2/api/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!res.ok) return null;
        
        const data = await res.json();
        return data;
    } catch (e) {
        console.error("Login error:", e);
        return null;
    }
  }
};


