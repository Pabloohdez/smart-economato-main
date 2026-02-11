import { showNotification } from "../utils/notifications.js";

// Ajusta la ruta relativa según tu estructura. Si 'pages/informes.html' es la vista:
const API_URL = '../api'; 

let usuarios = [];
let chartMensual = null;
let chartComparacion = null;

export async function initInformes() {
    console.log("📊 Iniciando módulo de Informes...");
    
    try {
        await cargarUsuarios();
        configurarEventos();
        
        // Cargar datos iniciales
        const promesas = [
            cargarDashboard(),
            aplicarFiltros() // Importante: Cargar la gráfica principal al inicio
        ];
        
        await Promise.all(promesas);

    } catch (error) {
        console.error('Error inicializando informes:', error);
        // Si no tienes showNotification implementado, usa console.error o alert
        if(typeof showNotification === 'function') {
            showNotification('Error al cargar informes', 'error');
        }
    }
}

async function cargarUsuarios() {
    try {
        const res = await fetch(`${API_URL}/informes.php?tipo=usuarios`);
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

    // Guardar selección actual si existe
    const valorActual = select.value;
    
    select.innerHTML = '<option value="">Todos los profesores</option>';
    
    usuarios.forEach(u => {
        const option = document.createElement('option');
        option.value = u.id;
        // Muestra nombre y cuánto lleva gastado
        option.textContent = `${u.nombre_completo} (${parseFloat(u.total_gastado).toFixed(2)}€)`;
        select.appendChild(option);
    });

    select.value = valorActual;
}

function configurarEventos() {
    const btnFiltrar = document.getElementById('btnFiltrar');
    // Eventos para filtros
    if (btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltros);
}

async function cargarDashboard() {
    try {
        const res = await fetch(`${API_URL}/informes.php?tipo=dashboard`);
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
    const elGasto = document.getElementById('statGasto');
    const elAlerta = document.getElementById('statAlertas');
    
    if(elGasto) elGasto.textContent = parseFloat(data.gasto_mensual).toFixed(2) + ' €';
    if(elAlerta) elAlerta.textContent = data.alertas_stock;

    // Tabla de últimos movimientos
    const tbody = document.querySelector('#tablaMovimientos tbody');
    if(tbody) {
        tbody.innerHTML = '';
        if (data.ultimos_movimientos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay movimientos recientes</td></tr>';
        } else {
            data.ultimos_movimientos.forEach(m => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(m.fecha).toLocaleDateString('es-ES')}</td>
                    <td>${m.producto}</td>
                    <td><span class="badge ${m.tipo === 'ENTRADA' ? 'badge-success' : 'badge-warning'}" 
                        style="padding: 2px 6px; border-radius: 4px; background-color: ${m.tipo === 'ENTRADA' ? '#d4edda' : '#fff3cd'}; color: ${m.tipo === 'ENTRADA' ? '#155724' : '#856404'};">
                        ${m.tipo}</span>
                    </td>
                    <td>${m.cantidad}</td>
                    <td>${m.usuario_nombre || 'Sistema'}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

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
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Gráfico horizontal para leer mejor los nombres
            plugins: {
                legend: { display: false }
            }
        }
    });
}

async function aplicarFiltros() {
    const usuario_id = document.getElementById('filtroUsuario')?.value || '';
    const fecha_inicio = document.getElementById('fechaInicio')?.value || '';
    const fecha_fin = document.getElementById('fechaFin')?.value || '';

    // Construir URL con parámetros
    const params = new URLSearchParams({
        tipo: 'gastos_mensuales',
        usuario_id: usuario_id,
        fecha_inicio: fecha_inicio,
        fecha_fin: fecha_fin
    });

    try {
        const res = await fetch(`${API_URL}/informes.php?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
            actualizarGastosMensuales(json.data);
        } else {
            console.error('Error data:', json.message);
        }
    } catch (error) {
        console.error('Error aplicando filtros:', error);
    }
}

function actualizarGastosMensuales(data) {
    // Actualizar KPI total del curso
    const elTotal = document.getElementById('statTotalCurso');
    if(elTotal) elTotal.textContent = parseFloat(data.total_curso).toFixed(2) + ' €';

    renderizarGraficoMensual(data.gastos_por_mes);
    renderizarTablaGastos(data.gastos_por_mes);
}

function renderizarGraficoMensual(gastosPorMes) {
    const ctx = document.getElementById('chartGastosMensuales');
    if (!ctx) return;

    if (chartMensual) {
        chartMensual.destroy();
    }

    // Ordenar datos por fecha
    gastosPorMes.sort((a, b) => a.mes.localeCompare(b.mes));

    // Obtener meses únicos (Eje X)
    const mesesUnicos = [...new Set(gastosPorMes.map(g => g.mes))];
    
    // Obtener usuarios únicos (Datasets)
    const usuariosIds = [...new Set(gastosPorMes.map(g => g.usuario_id))];

    const datasets = usuariosIds.map((uid, index) => {
        const datosUsuario = gastosPorMes.filter(g => g.usuario_id === uid);
        const nombreUsuario = datosUsuario[0]?.nombre_usuario || 'Desconocido';
        const color = getColorForIndex(index);

        // Mapear datos al eje X (rellenar con 0 si no hay gasto ese mes)
        const data = mesesUnicos.map(mes => {
            const registro = datosUsuario.find(g => g.mes === mes);
            return registro ? parseFloat(registro.total_mes) : 0;
        });

        return {
            label: nombreUsuario,
            data: data,
            borderColor: color,
            backgroundColor: color.replace('1)', '0.1)'),
            tension: 0.3,
            fill: false
        };
    });

    chartMensual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mesesUnicos,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Euros (€)' }
                }
            }
        }
    });
}

function renderizarTablaGastos(gastosPorMes) {
    const tbody = document.querySelector('#tablaGastosMensuales tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    // Invertir para ver lo más reciente arriba
    [...gastosPorMes].reverse().forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${g.mes}</td>
            <td>${g.nombre_usuario}</td>
            <td>${g.num_pedidos}</td>
            <td style="font-weight: bold; color: #d32f2f;">${parseFloat(g.total_mes).toFixed(2)} €</td>
        `;
        tbody.appendChild(tr);
    });
}

function getColorForIndex(index) {
    const colors = [
        'rgba(255, 99, 132, 1)',   // Rojo
        'rgba(54, 162, 235, 1)',   // Azul
        'rgba(255, 206, 86, 1)',   // Amarillo
        'rgba(75, 192, 192, 1)',   // Verde azulado
        'rgba(153, 102, 255, 1)',  // Violeta
        'rgba(255, 159, 64, 1)'    // Naranja
    ];
    return colors[index % colors.length];
}