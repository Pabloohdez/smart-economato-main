document.addEventListener("DOMContentLoaded", () => {
    console.log("Script de creación de usuario cargado correctamente.");

    const formulario = document.getElementById("formu");
    const mensaje = document.getElementById("mensaje");

    if (formulario) {
        formulario.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Intentando enviar formulario...");

            // 1. Recogemos los datos del HTML
            const nuevoUsuario = {
                usuario: document.getElementById("user-box1").value.trim(),
                password: document.getElementById("user-box2").value.trim(),
                nombre: document.getElementById("user-box3").value.trim(),
                apellidos: document.getElementById("user-box4").value.trim(),
                email: document.getElementById("user-box5").value.trim(),
                telefono: document.getElementById("user-box6").value.trim(),
                rol: "usuario"
            };

            // Validamos que no estén vacíos los campos clave
            if (!nuevoUsuario.usuario || !nuevoUsuario.password) {
                mostrarMensaje("Por favor, rellena usuario y contraseña.", "red");
                return;
            }

            try {

                


                const response = await fetch("http://localhost:4000/usuarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(nuevoUsuario)
                });

                if (response.ok) {
                    mostrarMensaje("¡Usuario creado! Redirigiendo...", "green");
                    console.log("Usuario creado. Redirigiendo en 1.5s...");
                    
                   
                        window.location.href = "../index.html";
                    
                } else {
                    throw new Error("Error al guardar el usuario");
                }

            } catch (error) {
                console.error("Error detectado:", error);
                mostrarMensaje("Error de conexión. Asegúrate de que el servidor json-server está corriendo en el puerto 4000.", "red");
            }
        });
    } else {
        console.error("No se encontró el formulario con id='formu'");
    }

    function mostrarMensaje(texto, color) {
        if (mensaje) {
            mensaje.textContent = texto;
            mensaje.style.color = color === "red" ? "#c53030" : "#2f855a";
            mensaje.style.fontWeight = "600";
        }
    }
});