import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [user, setUser] = useState("demo");
  const navigate = useNavigate();

  return (
    <div style={{ padding: 16 }}>
      <h1>Login</h1>

      <input value={user} onChange={(e) => setUser(e.target.value)} />
      <button
        onClick={() => {
          // Simulamos login
          localStorage.setItem("usuarioActivo", JSON.stringify({ user }));
          navigate("/inicio");
        }}
      >
        Entrar
      </button>
    </div>
  );
}
