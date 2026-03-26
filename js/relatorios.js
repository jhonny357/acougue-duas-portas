// ===== RELATÓRIOS =====

let chartVendas = null;
let chartCategorias = null;
let chartPagamentos = null;

// Atualizar relatórios
async function atualizarRelatorios() {
    const periodo = document.getElementById('rel-periodo').value;
    let dataInicio, dataFim;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    switch (periodo) {
        case 'hoje':
            dataInicio = hoje;
            dataFim = new Date(hoje);
            dataFim.setHours(23, 59, 59, 999);
            break;
        case 'semana':
            dataInicio = new Date(hoje);
            dataInicio.setDate(hoje.getDate() - hoje.getDay());
            dataFim = new Date(hoje);
            dataFim.setHours(23, 59, 59, 999);
            break;
        case 'mes':
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            dataFim = new Date(hoje);
            dataFim.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            document.querySelector('.filtro-custom').style.display = 'flex';
            dataInicio = new Date(document.getElementById('rel-data-inicio').value);
            dataFim = new Date(document.getElementById('rel-data-fim').value);
            dataFim.setHours(23, 59, 59, 999);
            break;
        default:
            document.querySelector('.filtro-custom').style.display = 'none';
    }
    
    if (periodo !== 'custom') {
        document.querySelector('.filtro-custom').style.display = 'none';
    }
    
    // Buscar vendas do período
    const vendas = await DB.getAll('vendas');
    const vendasPeriodo = vendas.filter(v => {
        const dataVenda = new Date(v.data);
        return dataVenda >= dataInicio && dataVenda <= dataFim;
    });
    
    // Gráfico de categorias
    await renderizarGraficoCategorias(vendasPeriodo);
    
    // Gráfico de pagamentos
    renderizarGraficoPagamentos(vendasPeriodo);
    
    // Tabela de vendas
    renderizarTabelaVendas(vendasPeriodo);
}

// Renderizar gráfico de categorias
async function renderizarGraficoCategorias(vendas) {
    const produtos = await DB.getAll('produtos');
    const categorias = {};
    
    vendas.forEach(v => {
        v.itens.forEach(item => {
            const produto = produtos.find(p => p.id === item.id);
            if (produto) {
                categorias[produto.categoria] = (categorias[produto.categoria] || 0) + item.total;
            }
        });
    });
    
    const labels = Object.keys(categorias).map(c => formatarCategoria(c).replace(/[^\w\s]/g, ''));
    const data = Object.values(categorias);
    
    const ctx = document.getElementById('chart-categorias');
    
    if (chartCategorias) chartCategorias.destroy();
    
    chartCategorias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#8B0000',
                    '#E74C3C',
                    '#F39C12',
                    '#27AE60',
                    '#3498DB'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Renderizar gráfico de pagamentos
function renderizarGraficoPagamentos(vendas) {
    const pagamentos = {
        dinheiro: 0,
        pix: 0,
        debito: 0,
        credito: 0,
        fiado: 0
    };
    
    vendas.forEach(v => {
        pagamentos[v.pagamento] = (pagamentos[v.pagamento] || 0) + v.total;
    });
    
    const labels = ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Fiado'];
    const data = [pagamentos.dinheiro, pagamentos.pix, pagamentos.debito, pagamentos.credito, pagamentos.fiado];
    
    const ctx = document.getElementById('chart-pagamentos');
    
    if (chartPagamentos) chartPagamentos.destroy();
    
    chartPagamentos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Valor (R$)',
                data,
                backgroundColor: [
                    '#27AE60',
                    '#3498DB',
                    '#9B59B6',
                    '#E74C3C',
                    '#F39C12'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Renderizar tabela de vendas
function renderizarTabelaVendas(vendas) {
    const tbody = document.getElementById('rel-vendas-tbody');
    
    if (vendas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-message">Nenhuma venda no período</td></tr>';
        return;
    }
    
    tbody.innerHTML = vendas.map(v => `
        <tr>
            <td>${new Date(v.data).toLocaleString('pt-BR')}</td>
            <td>${v.clienteNome}</td>
            <td>${v.itens.map(i => i.nome).join(', ')}</td>
            <td>${formatarPagamento(v.pagamento)}</td>
            <td><strong>R$ ${formatarMoeda(v.total)}</strong></td>
        </tr>
    `).join('');
}

// Exportar relatório
async function exportarRelatorio() {
    const vendas = await DB.getAll('vendas');
    const clientes = await DB.getAll('clientes');
    const produtos = await DB.getAll('produtos');
    
    let csv = 'Data,Cliente,Produtos,Pagamento,Total\n';
    
    vendas.forEach(v => {
        csv += `"${new Date(v.data).toLocaleString('pt-BR')}","${v.clienteNome}","${v.itens.map(i => i.nome).join('; ')}","${v.pagamento}","${v.total}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('Relatório exportado!', 'success');
}

// Gráfico da dashboard (vendas da semana)
async function renderizarGraficoDashboard() {
    const vendas = await DB.getAll('vendas');
    const hoje = new Date();
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Últimos 7 dias
    const ultimos7Dias = [];
    const totaisDias = [];
    
    for (let i = 6; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];
        
        ultimos7Dias.push(diasSemana[data.getDay()]);
        
        const totalDia = vendas
            .filter(v => v.data.split('T')[0] === dataStr)
            .reduce((sum, v) => sum + v.total, 0);
        
        totaisDias.push(totalDia);
    }
    
    const ctx = document.getElementById('chart-vendas');
    
    if (chartVendas) chartVendas.destroy();
    
    chartVendas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ultimos7Dias,
            datasets: [{
                label: 'Vendas (R$)',
                data: totaisDias,
                borderColor: '#8B0000',
                backgroundColor: 'rgba(139, 0, 0, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}