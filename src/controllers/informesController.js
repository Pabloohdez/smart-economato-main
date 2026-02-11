// src/controllers/informesController.js
import { showNotification } from "../utils/notifications.js";

const API_URL = 'http://localhost:8080/api';

let usuarios = [];
let chartMensual = null;
let chartComparacion = null;

export async function initInformes() {
    console.log("📊 Iniciando módulo de Informes...");
    
    try {
        await cargarUsuarios();
        configurarEventos();
        await cargarDashboard();
    } catch (error) {
        console.error('Error inicializando informes:', error);
        showNotification('Error al cargar informes', 'error');
    }
}

async function cargarUsuarios() {
    try {
        const res = await fetch(`${API_URL}/informes.php?tipo=usuarios`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const json = await res.json();

        if (json.success) {
            usuarios = json.data;
            renderizarFiltroUsuarios();
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

function renderizarFiltroUsuarios() {
    const select = document.getElementById('filtroUsuario');
    if (!select) return;

    select.innerHTML = '<option value="">Todos los profesores</option>';
    
    usuarios.forEach(u => {
        const option = document.createElement('option');
        option.value = u.id;
        option.textContent = `${u.nombre_completo} (${u.total_gastado.toFixed(2)}€)`;
        select.appendChild(option);
    });
}

function configurarEventos() {
    const btnFiltrar = document.getElementById('btnFiltrar');
    const filtroUsuario = document.getElementById('filtroUsuario');
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', aplicarFiltros);
    }

    if (filtroUsuario) {
        filtroUsuario.addEventListener('change', aplicarFiltros);
    }
}

async function cargarDashboard() {
    try {
        const res = await fetch(`${API_URL}/informes.php?tipo=dashboard`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const json = await res.json();

        if (json.success) {
            actualizarDashboard(json.data);
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

function actualizarDashboard(data) {
    // KPIs
    document.getElementById('statGasto').textContent = data.gasto_mensual.toFixed(2) + ' €';
    document.getElementById('statAlertas').textContent = data.alertas_stock;

    // Tabla de movimientos
    const tbody = document.querySelector('#tablaMovimientos tbody');
    tbody.innerHTML = '';
    data.ultimos_movimientos.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(m.fecha).toLocaleDateString('es-ES')}</td>
            <td>${m.producto}</td>
            <td><span class="badge ${m.tipo === 'ENTRADA' ? 'badge-success' : 'badge-warning'}">${m.tipo}</span></td>
            <td>${m.cantidad}</td>
            <td>${m.usuario_nombre || 'Sistema'}</td>
        `;
        tbody.appendChild(tr);
    });

    // Gráfico top productos
    renderizarGraficoTop(data.top_productos);
}

function renderizarGraficoTop(topProductos) {
    const ctx = document.getElementById('chartTopProductos');
    if (!ctx) return;

    const labels = topProductos.map(p => p.nombre);
    const counts = topProductos.map(p => p.total_salida);

    if (chartComparacion) {
        chartComparacion.destroy();
    }

    chartComparacion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Unidades Distribuidas',
                data: counts,
                backgroundColor: 'rgba(179, 49, 49, 0.6)',
                borderColor: 'rgba(179, 49, 49, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

async function aplicarFiltros() {
    const usuario_id = document.getElementById('filtroUsuario')?.value || '';
    const fecha_inicio = document.getElementById('fechaInicio')?.value || '';
    const fecha_fin = document.getElementById('fechaFin')?.value || '';

    let url = `${API_URL}/informes.php?tipo=gastos_mensuales`;
    if (usuario_id) url += `&usuario_id=${usuario_id}`;
    if (fecha_inicio) url += `&fecha_inicio=${fecha_inicio}`;
    if (fecha_fin) url += `&fecha_fin=${fecha_fin}`;

    try {
        const res = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const json = await res.json();

        if (json.success) {
            actualizarGastosMensuales(json.data);
        }
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        showNotification('Error al cargar datos', 'error');
    }
}

function actualizarGastosMensuales(data) {
    // Actualizar total del curso
    document.getElementById('statTotalCurso').textContent = data.total_curso.toFixed(2) + ' €';

    // Renderizar gráfico mensual
    renderizarGraficoMensual(data.gastos_por_mes);

    // Renderizar tabla
    renderizarTablaGastos(data.gastos_por_mes);
}

function renderizarGraficoMensual(gastosPorMes) {
    const ctx = document.getElementById('chartGastosMensuales');
    if (!ctx) return;

    // Agrupar por mes
    const mesesUnicos = [...new Set(gastosPorMes.map(g => g.mes))].sort();
    
    // Si hay un usuario específico, usar línea simple
    const usuariosUnicos = [...new Set(gastosPorMes.map(g => g.usuario_id))];

    const datasets = usuariosUnicos.map((uid, index) => {
        const color = getColorForIndex(index);
        const usuario = gastosPorMes.find(g => g.usuario_id === uid);
        
        return {
            label: usuario.nombre_usuario,
            data: mesesUnicos.map(mes => {
                const gasto = gastosPorMes.find(g => g.mes === mes && g.usuario_id === uid);
                return gasto ? gasto.total_mes : 0;
            }),
            borderColor: color,
            backgroundColor: color.replace('1)', '0.2)'),
            tension: 0.3,
            fill: usuariosUnicos.length === 1
        };
    });

    if (chartMensual) {
        chartMensual.destroy();
    }

    chartMensual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mesesUnicos,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: usuariosUnicos.length > 1
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '€';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(0) + '€';
                        }
                    }
                }
            }
        }
    });
}

function renderizarTablaGastos(gastosPorMes) {
    const tbody = document.querySelector('#tablaGastosMensuales tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    gastosPorMes.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${g.mes}</td>
            <td>${g.nombre_usuario}</td>
            <td>${g.num_pedidos}</td>
            <td class="font-bold text-primary">${g.total_mes.toFixed(2)} €</td>
        `;
        tbody.appendChild(tr);
    });
}

function getColorForIndex(index) {
    const colors = [
        'rgba(179, 49, 49, 1)',    // Red (theme color)
        'rgba(54, 162, 235, 1)',    // Blue
        'rgba(75, 192, 192, 1)',    // Teal
        'rgba(255, 206, 86, 1)',    // Yellow
        'rgba(153, 102, 255, 1)',   // Purple
        'rgba(255, 159, 64, 1)',    // Orange
    ];
    return colors[index % colors.length];
}
