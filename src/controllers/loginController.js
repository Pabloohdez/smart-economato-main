import { AuthService } from "../services/authservice.js";

document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("formu");

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        const usuario = document.getElementById("user-box1").value.trim();
        const password = document.getElementById("user-box2").value.trim();

        try {
            const user = await AuthService.login(usuario, password);

            if (user) {
                // Guardamos el objeto usuario en localStorage para usarlo en el menú
                localStorage.setItem('usuarioActivo', JSON.stringify(user));
                window.location.href = 'menu.html';
            } else {
                const resp = document.querySelector(".resp");
                if (resp) resp.textContent = "Usuario/Contraseña incorrecta";
            }
        } catch (error) {
            console.log(error);
            const resp = document.querySelector(".resp");
            if (resp) resp.textContent = "Error de conexión";
        }
    });
});