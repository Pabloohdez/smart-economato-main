const API_URL = 'http://localhost:4000'

export const AuthService = {
  async login(username, password) {
    const res = await fetch(`http://localhost:4000/usuarios?username=${username}&password=${password}`);
    const data = await res.json();
    return data.length ? data[0] : null;
  }
};
