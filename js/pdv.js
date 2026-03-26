// ===== SISTEMA DE PDV =====
let carrinho = [];
let produtoSelecionado = null;

// Carregar produtos no PDV
async function carregarProdutosPDV(categoria = 'todos') {
    const produtos = await DB.getAll('produtos');
    const grid = document.getElementById('pdv-produtos-grid');
    
    let produtosFiltrados = produtos;
    if (categoria !== 'todos') {
        produtosFiltrados = produtos.filter(p => p.categoria === categoria);
    }
    
    const emojis = {
        bovino: '🥩',
        suino: '🐷',
        aves: '🍗',
        embutidos: '🌭',
        outros: '📦'
    };
    
    grid.innerHTML = produtosFiltrados.map(p => `
        <div class="produto-card ${p.estoque <= 0 ? 'sem-estoque' : ''}" 
             onclick="selecionarProduto(${p.id})"
             data-id="${p.id}">
            <div class="produto-emoji">${emojis[p.categoria] || '📦'}</div>
            <div class="produto-nome">${p.nome}</div>
            <div class="produto-preco">R$ ${formatarMoeda(p.preco)}/${p.unidade}</div>
            <div class="produto-estoque">${p.estoque.toFixed(2)} ${p.unidade} em estoque</div>
        </div>
    `).join('');
}

// Selecionar produto
async function selecionarProduto(id) {
    produtoSelecionado = await DB.get('produtos', id);
    
    document.getElementById('modal-pdv-nome').textContent = produtoSelecionado.nome;
    document.getElementById('modal-pdv-preco').textContent = `R$ ${formatarMoeda(produtoSelecionado.preco)}/${produtoSelecionado.unidade}`;
    document.getElementById('modal-pdv-quantidade').value = produtoSelecionado.unidade === 'kg' ? '1.000' : '1';
    
    calcularTotalModal();
    abrirModal('modal-pdv-produto');
    document.getElementById('modal-pdv-quantidade').focus();
    document.getElementById('modal-pdv-quantidade').select();
}

// Calcular total no modal
function calcularTotalModal() {
    if (!produtoSelecionado) return;
    
    const quantidade = parseFloat(document.getElementById('modal-pdv-quantidade').value) || 0;
    const total = quantidade * produtoSelecionado.preco;
    
    document.getElementById('modal-pdv-total').textContent = `R$ ${formatarMoeda(total)}`;
}

// Adicionar ao carrinho
function confirmarAdicionarCarrinho() {
    if (!produtoSelecionado) return;
    
    const quantidade = parseFloat(document.getElementById('modal-pdv-quantidade').value) || 0;
    
    if (quantidade <= 0) {
        showToast('Quantidade inválida', 'error');
        return;
    }
    
    if (quantidade > produtoSelecionado.estoque) {
        showToast('Estoque insuficiente', 'error');
        return;
    }
    
    // Verificar se já existe no carrinho
    const existente = carrinho.find(item => item.id === produtoSelecionado.id);
    
    if (existente) {
        existente.quantidade += quantidade;
        existente.total = existente.quantidade * existente.preco;
    } else {
        carrinho.push({
            id: produtoSelecionado.id,
            codigo: produtoSelecionado.codigo,
            nome: produtoSelecionado.nome,
            preco: produtoSelecionado.preco,
            unidade: produtoSelecionado.unidade,
            quantidade: quantidade,
            total: quantidade * produtoSelecionado.preco
        });
    }
    
    atualizarCarrinho();
    fecharModal('modal-pdv-produto');
    playSound('beep');
    showToast(`${produtoSelecionado.nome} adicionado`, 'success');
}

// Atualizar visualização do carrinho
function atualizarCarrinho() {
    const container = document.getElementById('carrinho-itens');
    
    if (carrinho.length === 0) {
        container.innerHTML = '<p class="empty-cart">Carrinho vazio</p>';
    } else {
        container.innerHTML = carrinho.map((item, index) => `
            <div class="carrinho-item">
                <div class="item-info">
                    <div class="item-nome">${item.nome}</div>
                    <div class="item-detalhes">
                        ${item.quantidade.toFixed(3)} ${item.unidade} x R$ ${formatarMoeda(item.preco)}
                    </div>
                </div>
                <div class="item-total">R$ ${formatarMoeda(item.total)}</div>
                <button class="item-remover" onclick="removerItem(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    
    calcularTotais();
}

// Remover item do carrinho
function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

// Limpar carrinho
function limparCarrinho() {
    if (carrinho.length === 0) return;
    
    if (confirm('Limpar todo o carrinho?')) {
        carrinho = [];
        atualizarCarrinho();
        document.getElementById('pdv-desconto').value = 0;
        showToast('Carrinho limpo', 'info');
    }
}

// Calcular totais
function calcularTotais() {
    const subtotal = carrinho.reduce((sum, item) => sum + item.total, 0);
    
    const descontoInput = parseFloat(document.getElementById('pdv-desconto').value) || 0;
    const descontoTipo = document.getElementById('pdv-desconto-tipo').value;
    
    let desconto = 0;
    if (descontoTipo === 'percent') {
        desconto = subtotal * (descontoInput / 100);
    } else {
        desconto = descontoInput;
    }
    
    const total = Math.max(0, subtotal - desconto);
    
    document.getElementById('carrinho-subtotal').textContent = `R$ ${formatarMoeda(subtotal)}`;
    document.getElementById('carrinho-total').textContent = `R$ ${formatarMoeda(total)}`;
    
    return { subtotal, desconto, total };
}

// Atualizar troco
function atualizarTroco() {
    const pagamento = document.getElementById('pdv-pagamento').value;
    const trocoSection = document.getElementById('carrinho-troco');
    
    if (pagamento === 'dinheiro') {
        trocoSection.style.display = 'block';
    } else {
        trocoSection.style.display = 'none';
    }
}

// Calcular troco
function calcularTroco() {
    const { total } = calcularTotais();
    const valorRecebido = parseFloat(document.getElementById('pdv-valor-recebido').value) || 0;
    const troco = valorRecebido - total;
    
    document.getElementById('pdv-troco').textContent = `R$ ${formatarMoeda(Math.max(0, troco))}`;
    
    if (troco < 0) {
        document.getElementById('pdv-troco').style.color = 'var(--danger)';
    } else {
        document.getElementById('pdv-troco').style.color = 'var(--success)';
    }
}

// Finalizar venda
async function finalizarVenda() {
    if (carrinho.length === 0) {
        showToast('Carrinho vazio', 'error');
        return;
    }
    
    // Verificar caixa aberto
    const caixa = JSON.parse(localStorage.getItem('caixa') || '{}');
    // ===== SISTEMA DE PDV (Continuação) =====

// Finalizar venda
async function finalizarVenda() {
    if (carrinho.length === 0) {
        showToast('Carrinho vazio', 'error');
        return;
    }
    
    // Verificar caixa aberto
    const caixa = JSON.parse(localStorage.getItem('caixa') || '{}');
    if (!caixa.aberto) {
        showToast('Caixa fechado! Abra o caixa primeiro.', 'error');
        return;
    }
    
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    const { subtotal, desconto, total } = calcularTotais();
    const pagamento = document.getElementById('pdv-pagamento').value;
    const clienteId = document.getElementById('pdv-cliente').value;
    
    // Verificar fiado
    if (pagamento === 'fiado') {
        if (!clienteId) {
            showToast('Selecione um cliente para venda fiado', 'error');
            return;
        }
        
        const cliente = await DB.get('clientes', parseInt(clienteId));
        const novoFiado = (cliente.fiado || 0) + total;
        
        if (novoFiado > cliente.limite) {
            showToast(`Limite de fiado excedido! Limite: R$ ${formatarMoeda(cliente.limite)}`, 'error');
            return;
        }
    }
    
    // Verificar troco para dinheiro
    if (pagamento === 'dinheiro') {
        const valorRecebido = parseFloat(document.getElementById('pdv-valor-recebido').value) || 0;
        if (valorRecebido < total) {
            showToast('Valor recebido insuficiente', 'error');
            return;
        }
    }
    
    // Confirmação
    if (config.confirmarVenda) {
        if (!confirm(`Confirmar venda de R$ ${formatarMoeda(total)}?`)) {
            return;
        }
    }
    
    try {
        // Criar venda
        const venda = {
            data: new Date().toISOString(),
            clienteId: clienteId ? parseInt(clienteId) : null,
            clienteNome: clienteId ? (await DB.get('clientes', parseInt(clienteId))).nome : 'Cliente não identificado',
            itens: carrinho.map(item => ({...item})),
            subtotal,
            desconto,
            total,
            pagamento,
            usuario: Auth.currentUser.nome,
            usuarioId: Auth.currentUser.id
        };
        
        const vendaId = await DB.add('vendas', venda);
        
        // Atualizar estoque
        for (const item of carrinho) {
            const produto = await DB.get('produtos', item.id);
            produto.estoque -= item.quantidade;
            await DB.update('produtos', produto);
        }
        
        // Atualizar fiado do cliente
        if (pagamento === 'fiado' && clienteId) {
            const cliente = await DB.get('clientes', parseInt(clienteId));
            cliente.fiado = (cliente.fiado || 0) + total;
            cliente.ultimaCompra = new Date().toISOString();
            await DB.update('clientes', cliente);
        }
        
        // Atualizar pontos de fidelidade
        if (clienteId && pagamento !== 'fiado') {
            const cliente = await DB.get('clientes', parseInt(clienteId));
            const pontosGanhos = Math.floor(total * (config.pontosPorReal || 1));
            cliente.pontos = (cliente.pontos || 0) + pontosGanhos;
            cliente.ultimaCompra = new Date().toISOString();
            await DB.update('clientes', cliente);
        }
        
        // Registrar movimentação
        await DB.add('movimentacoes', {
            data: new Date().toISOString(),
            tipo: 'venda',
            descricao: `Venda #${vendaId}`,
            valor: total,
            pagamento,
            vendaId
        });
        
        // Mostrar recibo
        gerarRecibo({...venda, id: vendaId});
        
        // Limpar carrinho
        carrinho = [];
        atualizarCarrinho();
        document.getElementById('pdv-desconto').value = 0;
        document.getElementById('pdv-cliente').value = '';
        document.getElementById('pdv-valor-recebido').value = '';
        
        // Recarregar produtos
        carregarProdutosPDV();
        
        playSound('success');
        showToast('Venda realizada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao finalizar venda:', error);
        showToast('Erro ao finalizar venda', 'error');
    }
}

// Gerar recibo
function gerarRecibo(venda) {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    const dataVenda = new Date(venda.data);
    
    const reciboHtml = `
        <div class="recibo-header">
            <h2>${config.nomeEmpresa || 'Açougue Duas Portas'}</h2>
            <p>${config.endereco || ''}</p>
            <p>Tel: ${config.telefone || ''}</p>
            <p>CNPJ: ${config.cnpj || ''}</p>
        </div>
        
        <div class="recibo-info">
            <p><span>Data:</span><span>${dataVenda.toLocaleDateString('pt-BR')}</span></p>
            <p><span>Hora:</span><span>${dataVenda.toLocaleTimeString('pt-BR')}</span></p>
            <p><span>Venda:</span><span>#${venda.id}</span></p>
            <p><span>Cliente:</span><span>${venda.clienteNome}</span></p>
            <p><span>Atendente:</span><span>${venda.usuario}</span></p>
        </div>
        
        <div class="recibo-itens">
            ${venda.itens.map(item => `
                <div class="recibo-item">
                    <div class="recibo-item-nome">${item.nome}</div>
                    <div class="recibo-item-detalhes">
                        <span>${item.quantidade.toFixed(3)} ${item.unidade} x R$ ${formatarMoeda(item.preco)}</span>
                        <span>R$ ${formatarMoeda(item.total)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="recibo-totais">
            <p><span>Subtotal:</span><span>R$ ${formatarMoeda(venda.subtotal)}</span></p>
            ${venda.desconto > 0 ? `<p><span>Desconto:</span><span>- R$ ${formatarMoeda(venda.desconto)}</span></p>` : ''}
            <p class="total"><span>TOTAL:</span><span>R$ ${formatarMoeda(venda.total)}</span></p>
            <p><span>Pagamento:</span><span>${formatarPagamento(venda.pagamento)}</span></p>
        </div>
        
        <div class="recibo-footer">
            <p>Obrigado pela preferência!</p>
            <p>Volte sempre!</p>
        </div>
    `;
    
    document.getElementById('recibo-container').innerHTML = reciboHtml;
    abrirModal('modal-recibo');
}

// Imprimir recibo
function imprimirRecibo() {
    window.print();
}

// Buscar produto
function searchProduto() {
    const termo = document.getElementById('pdv-search').value.toLowerCase();
    const cards = document.querySelectorAll('.produto-card');
    
    cards.forEach(card => {
        const nome = card.querySelector('.produto-nome').textContent.toLowerCase();
        if (nome.includes(termo) || termo === '') {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Carregar clientes no select do PDV
async function carregarClientesPDV() {
    const clientes = await DB.getAll('clientes');
    const select = document.getElementById('pdv-cliente');
    
    select.innerHTML = '<option value="">Cliente não identificado</option>' +
        clientes.map(c => `<option value="${c.id}">${c.nome} - ${c.telefone}</option>`).join('');
}

// Event Listeners do PDV
document.addEventListener('DOMContentLoaded', () => {
    // Categorias
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarProdutosPDV(btn.dataset.cat);
        });
    });
    
    // Quantidade modal
    document.getElementById('modal-pdv-quantidade')?.addEventListener('input', calcularTotalModal);
    
    // Enter para adicionar
    document.getElementById('modal-pdv-quantidade')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmarAdicionarCarrinho();
        }
    });
    
    // Desconto
    document.getElementById('pdv-desconto')?.addEventListener('input', calcularTotais);
    document.getElementById('pdv-desconto-tipo')?.addEventListener('change', calcularTotais);
    
    // Pagamento
    document.getElementById('pdv-pagamento')?.addEventListener('change', atualizarTroco);
    
    // Troco
    document.getElementById('pdv-valor-recebido')?.addEventListener('input', calcularTroco);
    
    // Busca
    document.getElementById('pdv-search')?.addEventListener('input', searchProduto);
});