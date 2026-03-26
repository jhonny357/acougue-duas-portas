// ===== GESTÃO DE CLIENTES =====

// Carregar clientes na tabela
async function carregarClientes(filtro = 'todos') {
    const clientes = await DB.getAll('clientes');
    const tbody = document.getElementById('clientes-tbody');
    
    let clientesFiltrados = clientes;
    
    if (filtro === 'fiado') {
        clientesFiltrados = clientes.filter(c => c.fiado > 0);
    } else if (filtro === 'fidelidade') {
        clientesFiltrados = clientes.filter(c => c.pontos > 0).sort((a, b) => b.pontos - a.pontos);
    }
    
    if (clientesFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-message">Nenhum cliente encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientesFiltrados.map(c => `
        <tr>
            <td><strong>${c.nome}</strong></td>
            <td>${c.telefone || '-'}</td>
            <td class="${c.fiado > 0 ? 'text-danger' : ''}">
                R$ ${formatarMoeda(c.fiado || 0)}
                ${c.fiado > 0 ? `<br><small>Limite: R$ ${formatarMoeda(c.limite)}</small>` : ''}
            </td>
            <td>
                <span class="badge">${c.pontos || 0} pts</span>
            </td>
            <td>${c.ultimaCompra ? new Date(c.ultimaCompra).toLocaleDateString('pt-BR') : '-'}</td>
            <td class="actions">
                <button class="btn-icon" onclick="editarCliente(${c.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="verHistoricoCliente(${c.id})" title="Histórico">
                    <i class="fas fa-history"></i>
                </button>
                <button class="btn-icon danger" onclick="excluirCliente(${c.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Abrir modal de cliente
function abrirModalCliente() {
    document.getElementById('modal-cliente-titulo').textContent = 'Novo Cliente';
    document.getElementById('form-cliente').reset();
    document.getElementById('cliente-id').value = '';
    abrirModal('modal-cliente');
}

// Abrir modal para novo cliente (do PDV)
function abrirModalNovoCliente() {
    abrirModalCliente();
}

// Editar cliente
async function editarCliente(id) {
    const cliente = await DB.get('clientes', id);
    
    document.getElementById('modal-cliente-titulo').textContent = 'Editar Cliente';
    document.getElementById('cliente-id').value = cliente.id;
    document.getElementById('cliente-nome').value = cliente.nome || '';
    document.getElementById('cliente-cpf').value = cliente.cpf || '';
    document.getElementById('cliente-telefone').value = cliente.telefone || '';
    document.getElementById('cliente-whatsapp').value = cliente.whatsapp || '';
    document.getElementById('cliente-endereco').value = cliente.endereco || '';
    document.getElementById('cliente-nascimento').value = cliente.nascimento || '';
    document.getElementById('cliente-limite').value = cliente.limite || 0;
    document.getElementById('cliente-obs').value = cliente.obs || '';
    
    abrirModal('modal-cliente');
}

// Salvar cliente
async function salvarCliente() {
    const id = document.getElementById('cliente-id').value;
    const nome = document.getElementById('cliente-nome').value.trim();
    const telefone = document.getElementById('cliente-telefone').value.trim();
    
    if (!nome || !telefone) {
        showToast('Nome e telefone são obrigatórios', 'error');
        return;
    }
    
    const cliente = {
        nome,
        cpf: document.getElementById('cliente-cpf').value.trim(),
        telefone,
        whatsapp: document.getElementById('cliente-whatsapp').value.trim(),
        endereco: document.getElementById('cliente-endereco').value.trim(),
        nascimento: document.getElementById('cliente-nascimento').value,
        limite: parseFloat(document.getElementById('cliente-limite').value) || 0,
        obs: document.getElementById('cliente-obs').value.trim()
    };
    
    try {
        if (id) {
            cliente.id = parseInt(id);
            const clienteExistente = await DB.get('clientes', parseInt(id));
            cliente.fiado = clienteExistente.fiado || 0;
            cliente.pontos = clienteExistente.pontos || 0;
            cliente.ultimaCompra = clienteExistente.ultimaCompra;
            await DB.update('clientes', cliente);
            showToast('Cliente atualizado!', 'success');
        } else {
            cliente.fiado = 0;
            cliente.pontos = 0;
            await DB.add('clientes', cliente);
            showToast('Cliente cadastrado!', 'success');
        }
        
        fecharModal('modal-cliente');
        carregarClientes();
        carregarClientesPDV();
        
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        showToast('Erro ao salvar cliente', 'error');
    }
}

// Excluir cliente
async function excluirCliente(id) {
    const cliente = await DB.get('clientes', id);
    
    if (cliente.fiado > 0) {
        showToast('Não é possível excluir cliente com fiado pendente', 'error');
        return;
    }
    
    if (confirm(`Excluir cliente "${cliente.nome}"?`)) {
        await DB.delete('clientes', id);
        showToast('Cliente excluído', 'success');
        carregarClientes();
        carregarClientesPDV();
    }
}

// Ver histórico do cliente
async function verHistoricoCliente(id) {
    const cliente = await DB.get('clientes', id);
    const vendas = await DB.getAll('vendas');
    const vendasCliente = vendas.filter(v => v.clienteId === id);
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h4>${cliente.nome}</h4>
            <p>Telefone: ${cliente.telefone}</p>
            <p>Fiado: <strong class="text-danger">R$ ${formatarMoeda(cliente.fiado || 0)}</strong></p>
            <p>Pontos: <strong>${cliente.pontos || 0}</strong></p>
        </div>
        <h4>Últimas Compras</h4>
    `;
    
    if (vendasCliente.length === 0) {
        html += '<p class="empty-message">Nenhuma compra registrada</p>';
    } else {
        html += '<div class="table-container"><table class="data-table"><thead><tr><th>Data</th><th>Valor</th><th>Pagamento</th></tr></thead><tbody>';
        vendasCliente.slice(-10).reverse().forEach(v => {
            html += `<tr>
                <td>${new Date(v.data).toLocaleDateString('pt-BR')}</td>
                <td>R$ ${formatarMoeda(v.total)}</td>
                <td>${formatarPagamento(v.pagamento)}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    document.getElementById('confirmar-titulo').textContent = 'Histórico do Cliente';
    document.getElementById('confirmar-mensagem').innerHTML = html;
    document.getElementById('confirmar-btn').style.display = 'none';
    abrirModal('modal-confirmar');
}

// Filtrar clientes
function filtrarClientes() {
    const termo = document.getElementById('clientes-search').value.toLowerCase();
    const rows = document.querySelectorAll('#clientes-tbody tr');
    
    rows.forEach(row => {
        const texto = row.textContent.toLowerCase();
        row.style.display = texto.includes(termo) ? '' : 'none';
    });
}

// Event Listeners Clientes
document.addEventListener('DOMContentLoaded', () => {
    // Tabs de clientes
    document.querySelectorAll('.clientes-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.clientes-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarClientes(btn.dataset.tab);
        });
    });
});