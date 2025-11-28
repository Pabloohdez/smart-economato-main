document.addEventListener("DOMContentLoaded", () => {
  const flecha = document.querySelector(".flecha");
  const usuario = document.querySelector(".usuario");
  const entrar = document.querySelector(".entrar");
  const boton = document.querySelector("#btnIngresar");

  if (flecha) {
    flecha.addEventListener("click", () => {
      window.location.href = "../../menu.html";
    });
  }

  if (usuario) {
    usuario.addEventListener("click", () => {
      window.location.href = "../../index.html";
    });
  }
  if (boton) {
    boton.addEventListener("click", () => {
    window.location.href = "../../IngresarProducto.html";
    });
  }

});





