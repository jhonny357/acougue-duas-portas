// ===== GESTÃO DE ESTOQUE =====

// Carregar produtos na tabela
async function carregarEstoque(filtro = 'todos') {
    const produtos = await DB.getAll('produtos');
    const tbody = document.getElementById('estoque-tbody');
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    
    let produtosFiltrados = produtos;
    
    if (filtro === 'baixo') {
        produtosFiltrados = produtos.filter(p => p.estoque <= p.estoqueMin);
    } else if (filtro !== 'todos') {
        produtosFiltrados = produtos.filter(p => p.categoria === filtro);
    }
    
    if (produtosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-message">Nenhum produto encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = produtosFiltrados.map(p => {
        const estoqueBaixo = p.estoque <= p.estoqueMin;
        const validadeProxima = p.validade && diasAteValidade(p.validade) <= (config.diasAlertaValidade || 3);
        
        return `
            <tr class="${estoqueBaixo ? 'estoque-baixo' : ''}">
                <td><code>${p.codigo}</code></td>
                <td><strong>${p.nome}</strong></td>
                <td>${formatarCategoria(p.categoria)}</td>
                <td>R$ ${formatarMoeda(p.preco)}</td>
                <td class="${estoqueBaixo ? 'text-danger' : ''}">
                    ${p.estoque.toFixed(2)} ${p.unidade}
                    ${estoqueBaixo ? '<br><small>⚠️ Estoque baixo</small>' : ''}
                </td>
                <td class="${validadeProxima ? 'text-warning' : ''}">
                    ${p.validade ? new Date(p.validade).toLocaleDateString('pt-BR') : '-'}
                    ${validadeProxima ? '<br><small>⚠️ Próximo ao vencimento</small>' : ''}
                </td>
                <td class="actions">
                    <button class="btn-icon" onclick="editarProduto(${p.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="adicionarEstoque(${p.id})" title="Adicionar Estoque">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn-icon danger" onclick="excluirProduto(${p.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Calcular dias até validade
function diasAteValidade(data) {
    const hoje = new Date();
    const validade = new Date(data);
    const diff = validade - hoje;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Formatar categoria
function formatarCategoria(cat) {
    const categorias = {
        bovino: '🐄 Bovino',
        suino: '🐷 Suíno',
        aves: '🐔 Aves',
        embutidos: '🌭 Embutidos',
        outros: '📦 Outros'
    };
    return categorias[cat] || cat;
}

// Abrir modal de produto
function abrirModalProduto() {
    document.getElementById('modal-produto-titulo').textContent = 'Novo Produto';
    document.getElementById('form-produto').reset();
    document.getElementById('produto-id').value = '';
    document.getElementById('produto-codigo').value = gerarCodigoProduto();
    abrirModal('modal-produto');
}

// Gerar código de produto
async function gerarCodigoProduto() {
    const produtos = await DB.getAll('produtos');
    const ultimoCodigo = produtos.reduce((max, p) => {
        const num = parseInt(p.codigo) || 0;
        return num > max ? num : max;
    }, 0);
    return String(ultimoCodigo + 1).padStart(3, '0');
}

// Editar produto
async function editarProduto(id) {
    const produto = await DB.get('produtos', id);
    
    document.getElementById('modal-produto-titulo').textContent = 'Editar Produto';
    document.getElementById('produto-id').value = produto.id;
    document.getElementById('produto-codigo').value = produto.codigo;
    document.getElementById('produto-nome').value = produto.nome;
    document.getElementById('produto-categoria').value = produto.categoria;
    document.getElementById('produto-unidade').value = produto.unidade;
    document.getElementById('produto-custo').value = produto.custo || '';
    document.getElementById('produto-preco').value = produto.preco;
    document.getElementById('produto-estoque').value = produto.estoque;
    document.getElementById('produto-estoque-min').value = produto.estoqueMin;
    document.getElementById('produto-validade').value = produto.validade || '';
    
    abrirModal('modal-produto');
}

// Salvar produto
async function salvarProduto() {
    const id = document.getElementById('produto-id').value;
    const nome = document.getElementById('produto-nome').value.trim();
    const preco = parseFloat(document.getElementById('produto-preco').value);
    
    if (!nome || !preco) {
        showToast('Nome e preço são obrigatórios', 'error');
        return;
    }
    
    const produto = {
        codigo: document.getElementById('produto-codigo').value.trim(),
        nome,
        categoria: document.getElementById('produto-categoria').value,
        unidade: document.getElementById('produto-unidade').value,
        custo: parseFloat(document.getElementById('produto-custo').value) || 0,
        preco,
        estoque: parseFloat(document.getElementById('produto-estoque').value) || 0,
        estoqueMin: parseFloat(document.getElementById('produto-estoque-min').value) || 5,
        validade: document.getElementById('produto-validade').value || null
    };
    
    try {
        if (id) {
            produto.id = parseInt(id);
            await DB.update('produtos', produto);
            showToast('Produto atualizado!', 'success');
        } else {
            await DB.add('produtos', produto);
            showToast('Produto cadastrado!', 'success');
        }
        
        fecharModal('modal-produto');
        carregarEstoque();
        carregarProdutosPDV();
        
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showToast('Erro ao salvar produto', 'error');
    }
}

// Excluir produto
async function excluirProduto(id) {
    const produto = await DB.get('produtos', id);
    
    if (confirm(`Excluir produto "${produto.nome}"?`)) {
        await DB.delete('produtos', id);
        showToast('Produto excluído', 'success');
        carregarEstoque();
        carregarProdutosPDV();
    }
}

// Adicionar estoque rápido
async function adicionarEstoque(id) {
    const produto = await DB.get('produtos', id);
    const quantidade = prompt(`Adicionar estoque para "${produto.nome}"\nQuantidade atual: ${produto.estoque} ${produto.unidade}\n\nQuantidade a adicionar:`);
    
    if (quantidade && !isNaN(quantidade)) {
        produto.estoque += parseFloat(quantidade);
        await DB.update('produtos', produto);
        showToast('Estoque atualizado!', 'success');
        carregarEstoque();
        carregarProdutosPDV();
    }
}

// Abrir modal de entrada
async function abrirModalEntrada() {
    const produtos = await DB.getAll('produtos');
    const select = document.getElementById('entrada-produto');
    
    select.innerHTML = '<option value="">Selecione um produto</option>' +
        produtos.map(p => `<option value="${p.id}">${p.codigo} - ${p.nome}</option>`).join('');
    
    document.getElementById('entrada-quantidade').value = '';
    document.getElementById('entrada-custo').value = '';
    document.getElementById('entrada-validade').value = '';
    document.getElementById('entrada-fornecedor').value = '';
    document.getElementById('entrada-nf').value = '';
    
    abrirModal('modal-entrada');
}

// Registrar entrada
async function registrarEntrada() {
    const produtoId = document.getElementById('entrada-produto').value;
    const quantidade = parseFloat(document.getElementById('entrada-quantidade').value);
    
    if (!produtoId || !quantidade) {
        showToast('Selecione um produto e informe a quantidade', 'error');
        return;
    }
    
    try {
        const produto = await DB.get('produtos', parseInt(produtoId));
        produto.estoque += quantidade;
        
        const custo = parseFloat(document.getElementById('entrada-custo').value);
        if (custo) produto.custo = custo;
        
        const validade = document.getElementById('entrada-validade').value;
        if (validade) produto.validade = validade;
        
        await DB.update('produtos', produto);
        
        // Registrar movimentação
        await DB.add('movimentacoes', {
            data: new Date().toISOString(),
            tipo: 'entrada',
            descricao: `Entrada de ${quantidade} ${produto.unidade} de ${produto.nome}`,
            valor: custo * quantidade || 0,
            fornecedor: document.getElementById('entrada-fornecedor').value,
            nf: document.getElementById('entrada-nf').value,
            produtoId: produto.id
        });
        
        fecharModal('modal-entrada');
        showToast('Entrada registrada!', 'success');
        carregarEstoque();
        carregarProdutosPDV();
        
    } catch (error) {
        console.error('Erro ao registrar entrada:', error);
        showToast('Erro ao registrar entrada', 'error');
    }
}

// Filtrar estoque
function filtrarEstoque() {
    const termo = document.getElementById('estoque-search').value.toLowerCase();
    const rows = document.querySelectorAll('#estoque-tbody tr');
    
    rows.forEach(row => {
        const texto = row.textContent.toLowerCase();
        row.style.display = texto.includes(termo) ? '' : 'none';
    });
}

// Event Listeners Estoque
document.addEventListener('DOMContentLoaded', () => {
    // Tabs de estoque
    document.querySelectorAll('.estoque-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.estoque-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarEstoque(btn.dataset.tab);
        });
    });
});