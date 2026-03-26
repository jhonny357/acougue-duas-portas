// ===== GESTÃO FINANCEIRA =====

// Verificar status do caixa
function verificarCaixa() {
    const caixa = JSON.parse(localStorage.getItem('caixa') || '{}');
    const btnCaixa = document.getElementById('btn-caixa');
    const estadoCaixa = document.getElementById('caixa-estado');
    
    if (caixa.aberto) {
        estadoCaixa.textContent = 'Aberto';
        estadoCaixa.className = 'aberto';
        btnCaixa.innerHTML = '<i class="fas fa-lock"></i><span>Fechar Caixa</span>';
        btnCaixa.onclick = abrirModalFechamento;
    } else {
        estadoCaixa.textContent = 'Fechado';
        estadoCaixa.className = 'fechado';
        btnCaixa.innerHTML = '<i class="fas fa-cash-register"></i><span>Abrir Caixa</span>';
        btnCaixa.onclick = () => abrirModal('modal-caixa');
    }
}

// Toggle Caixa
function toggleCaixa() {
    const caixa = JSON.parse(localStorage.getItem('caixa') || '{}');
    if (caixa.aberto) {
        abrirModalFechamento();
    } else {
        abrirModal('modal-caixa');
    }
}

// Abrir caixa
function abrirCaixa() {
    const valorInicial = parseFloat(document.getElementById('caixa-valor-inicial').value) || 0;
    
    const caixa = {
        aberto: true,
        dataAbertura: new Date().toISOString(),
        valorInicial,
        usuario: Auth.currentUser.nome,
        usuarioId: Auth.currentUser.id
    };
    
    localStorage.setItem('caixa', JSON.stringify(caixa));
    
    // Registrar movimentação
    DB.add('movimentacoes', {
        data: new Date().toISOString(),
        tipo: 'abertura',
        descricao: 'Abertura de caixa',
        valor: valorInicial
    });
    
    fecharModal('modal-caixa');
    verificarCaixa();
    carregarFinanceiro();
    showToast('Caixa aberto!', 'success');
}

// Abrir modal de fechamento
async function abrirModalFechamento() {
    const caixa = JSON.parse(localStorage.getItem('caixa') || '{}');
    const hoje = new Date().toISOString().split('T')[0];
    const movimentacoes = await DB.getAll('movimentacoes');
    const vendas = await DB.getAll('vendas');
    
    // Filtrar movimentações de hoje
    const movHoje = movimentacoes.filter(m => m.data.split('T')[0] === hoje);
    const vendasHoje = vendas.filter(v => v.data.split('T')[0] === hoje);
    
    // Calcular totais por forma de pagamento
    const totais = {
        dinheiro: 0,
        pix: 0,
        debito: 0,
        credito: 0,
        fiado: 0
    };
    
    vendasHoje.forEach(v => {
        totais[v.pagamento] = (totais[v.pagamento] || 0) + v.total;
    });
    
    // Calcular sangrias e reforços
    let sangrias = 0;
    let reforcos = 0;
    
    movHoje.forEach(m => {
        if (m.tipo === 'sangria') sangrias += m.valor;
        if (m.tipo === 'reforco') reforcos += m.valor;
    });
    
    // Valor esperado em caixa (dinheiro)
    const esperado = caixa.valorInicial + totais.dinheiro + reforcos - sangrias;
    
    // Preencher modal
    document.getElementById('fech-inicial').textContent = `R$ ${formatarMoeda(caixa.valorInicial)}`;
    document.getElementById('fech-dinheiro').textContent = `R$ ${formatarMoeda(totais.dinheiro)}`;
    document.getElementById('fech-pix').textContent = `R$ ${formatarMoeda(totais.pix)}`;
    document.getElementById('fech-debito').textContent = `R$ ${formatarMoeda(totais.debito)}`;
    document.getElementById('fech-credito').textContent = `R$ ${formatarMoeda(totais.credito)}`;
    document.getElementById('fech-fiado').textContent = `R$ ${formatarMoeda(totais.fiado)}`;
    document.getElementById('fech-sangrias').textContent = `- R$ ${formatarMoeda(sangrias)}`;
    document.getElementById('fech-reforcos').textContent = `R$ ${formatarMoeda(reforcos)}`;
    document.getElementById('fech-esperado').textContent = `R$ ${formatarMoeda(esperado)}`;
    
    document.getElementById('fech-contado').value = '';
    document.getElementById('fech-diferenca').textContent = 'R$ 0,00';
    document.getElementById('fech-obs').value = '';
    
    // Salvar esperado para cálculo
    document.getElementById('modal-fechamento').dataset.esperado = esperado;
    
    abrirModal('modal-fechamento');
}

// Calcular diferença no fechamento
function calcularDiferenca() {
    const esperado = parseFloat(document.getElementById('modal-fechamento').dataset.esperado) || 0;
    const contado = parseFloat(document.getElementById('fech-contado').value) || 0;
    const diferenca = contado - esperado;
    
    const divDiferenca = document.getElementById('diferenca-caixa');
    document.getElementById('fech-diferenca').textContent = `R$ ${formatarMoeda(Math.abs(diferenca))}`;
    
    if (diferenca > 0) {
        divDiferenca.className = 'diferenca-caixa positivo';
        document.getElementById('fech-diferenca').textContent = `+ R$ ${formatarMoeda(diferenca)}`;
    } else if (diferenca < 0) {
        divDiferenca.className = 'diferenca-caixa negativo';
        document.getElementById('fech-diferenca').textContent = `- R$ ${formatarMoeda(Math.abs(diferenca))}`;
    } else {
        divDiferenca.className = 'diferenca-caixa';
    }
}

// Fechar caixa
async function fecharCaixa() {
    const contado = parseFloat(document.getElementById('fech-contado').value);
    
    if (isNaN(contado)) {
        showToast('Informe o valor contado em caixa', 'error');
        return;
    }
    
    const esperado = parseFloat(document.getElementById('modal-fechamento').dataset.esperado) || 0;
    const diferenca = contado - esperado;
    const obs = document.getElementById('fech-obs').value;
    
    // Registrar fechamento
    await DB.add('movimentacoes', {
        data: new Date().toISOString(),
        tipo: 'fechamento',
        descricao: 'Fechamento de caixa',
        valor: contado,
        esperado,
        diferenca,
        obs,
        usuario: Auth.currentUser.nome
    });
    
    // Limpar caixa
    localStorage.setItem('caixa', JSON.stringify({ aberto: false }));
    
    fecharModal('modal-fechamento');
    verificarCaixa();
    carregarFinanceiro();
    showToast('Caixa fechado!', 'success');
}

// Abrir modal de sangria
function abrirModalSangria() {
    const caixa = JSON.parse(localStorage.getItem('caixa') || '{}');
    if (!caixa.aberto) {
        showToast('Caixa fechado!', 'error');
        return;
    }
    
    document.getElementById('sangria-valor').value = '';
    document.getElementById('sangria-motivo').value = '';
    abrirModal('modal-sangria');
}

// Realizar sangria
async function realizarSangria() {
    const valor = parseFloat(document.getElementById('sangria-valor').value);
    const motivo = document.getElementById('sangria-motivo').value;
    
    if (!valor || valor <= 0) {
        showToast('Informe um valor válido', 'error');
        return;
    }
    
    await DB.add('movimentacoes', {
        data: new Date().toISOString(),
        tipo: 'sangria',
        descricao: motivo || 'Sangria de caixa',
        valor,
        usuario: Auth.currentUser.nome
    });
    
    fecharModal('modal-sangria');
    carregarFinanceiro();
    showToast('Sangria registrada!', 'success');
}

// Abrir modal de reforço
function abrirModalReforco() {
    const caixa = JSON.parse(localStorage.getItem('caixa') || '{}');
    if (!caixa.aberto) {
        showToast('Caixa fechado!', 'error');
        return;
    }
    
    document.getElementById('reforco-valor').value = '';
    document.getElementById('reforco-motivo').value = '';
    abrirModal('modal-reforco');
}

// Realizar reforço
async function realizarReforco() {
    const valor = parseFloat(document.getElementById('reforco-valor').value);
    const motivo = document.getElementById('reforco-motivo').value;
    
    if (!valor || valor <= 0) {
        showToast('Informe um valor válido', 'error');
        return;
    }
    
    await DB.add('movimentacoes', {
        data: new Date().toISOString(),
        tipo: 'reforco',
        descricao: motivo || 'Reforço de caixa',
        valor,
        usuario: Auth.currentUser.nome
    });
    
    fecharModal('modal-reforco');
    carregarFinanceiro();
    showToast('Reforço registrado!', 'success');
}

// Abrir modal de receber fiado
async function abrirModalReceberFiado() {
    const clientes = await DB.getAll('clientes');
    const clientesComFiado = clientes.filter(c => c.fiado > 0);
    
    const select = document.getElementById('fiado-cliente');
    select.innerHTML = '<option value="">Selecione um cliente</option>' +
        clientesComFiado.map(c => `<option value="${c.id}">${c.nome} - Fiado: R$ ${formatarMoeda(c.fiado)}</option>`).join('');
    
    document.getElementById('fiado-valor').value = '';
    document.getElementById('fiado-info').style.display = 'none';
    
    abrirModal('modal-receber-fiado');
}

// Carregar fiado do cliente
async function carregarFiadoCliente() {
    const clienteId = document.getElementById('fiado-cliente').value;
    
    if (!clienteId) {
        document.getElementById('fiado-info').style.display = 'none';
        return;
    }
    
    const cliente = await DB.get('clientes', parseInt(clienteId));
    document.getElementById('fiado-total').textContent = `R$ ${formatarMoeda(cliente.fiado)}`;
    document.getElementById('fiado-valor').value = cliente.fiado;
    document.getElementById('fiado-info').style.display = 'block';
}

// Receber fiado
async function receberFiado() {
    const clienteId = document.getElementById('fiado-cliente').value;
    const valor = parseFloat(document.getElementById('fiado-valor').value);
    const pagamento = document.getElementById('fiado-pagamento').value;
    
    if (!clienteId || !valor) {
        showToast('Selecione um cliente e informe o valor', 'error');
        return;
    }
    
    const cliente = await DB.get('clientes', parseInt(clienteId));
    
    if (valor > cliente.fiado) {
        showToast('Valor maior que o fiado pendente', 'error');
        return;
    }
    
    cliente.fiado -= valor;
    await DB.update('clientes', cliente);
    
    // Registrar movimentação
    await DB.add('movimentacoes', {
        data: new Date().toISOString(),
        tipo: 'recebimento_fiado',
        descricao: `Recebimento de fiado - ${cliente.nome}`,
        valor,
        pagamento,
        clienteId: cliente.id
    });
    
    fecharModal('modal-receber-fiado');
    carregarFinanceiro();
    carregarClientes();
    showToast('Pagamento recebido!', 'success');
}

// Carregar dados financeiros
async function carregarFinanceiro() {
    verificarCaixa();
    
    const hoje = new Date().toISOString().split('T')[0];
    const movimentacoes = await DB.getAll('movimentacoes');
    const vendas = await DB.getAll('vendas');
    
    // Filtrar de hoje
    const movHoje = movimentacoes.filter(m => m.data.split('T')[0] === hoje);
    const vendasHoje = vendas.filter(v => v.data.split('T')[0] === hoje);
    
    // Calcular totais
    let entradas = 0;
    let saidas = 0;
    let fiados = 0;
    
    vendasHoje.forEach(v => {
        if (v.pagamento === 'fiado') {
            fiados += v.total;
        } else {
            entradas += v.total;
        }
    });
    
    movHoje.forEach(m => {
        if (m.tipo === 'sangria') saidas += m.valor;
        if (m.tipo === 'reforco') entradas += m.valor;
        if (m.tipo === 'recebimento_fiado') entradas += m.valor;
    });
    
    // Atualizar cards
    document.getElementById('fin-entradas').textContent = `R$ ${formatarMoeda(entradas)}`;
    document.getElementById('fin-saidas').textContent = `R$ ${formatarMoeda(saidas)}`;
    document.getElementById('fin-saldo').textContent = `R$ ${formatarMoeda(entradas - saidas)}`;
    document.getElementById('fin-fiados').textContent = `R$ ${formatarMoeda(fiados)}`;
    
    // Carregar movimentações
    const tbody = document.getElementById('movimentacoes-tbody');
    
    if (movHoje.length === 0 && vendasHoje.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-message">Nenhuma movimentação hoje</td></tr>';
        return;
    }
    
    // Combinar e ordenar
    const todasMovs = [
        ...vendasHoje.map(v => ({
            hora: new Date(v.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            tipo: 'Venda',
            descricao: `Venda #${v.id} - ${formatarPagamento(v.pagamento)}`,
            valor: v.total,
            classe: v.pagamento === 'fiado' ? 'text-warning' : 'text-success'
        })),
        ...movHoje.map(m => ({
            hora: new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            tipo: formatarTipoMov(m.tipo),
            descricao: m.descricao,
            valor: m.valor,
            classe: m.tipo === 'sangria' ? 'text-danger' : 'text-success'
        }))
    ].sort((a, b) => b.hora.localeCompare(a.hora));
    
    tbody.innerHTML = todasMovs.map(m => `
        <tr>
            <td>${m.hora}</td>
            <td>${m.tipo}</td>
            <td>${m.descricao}</td>
            <td class="${m.classe}">R$ ${formatarMoeda(m.valor)}</td>
        </tr>
    `).join('');
}

// Formatar tipo de movimentação
function formatarTipoMov(tipo) {
    const tipos = {
        abertura: '📂 Abertura',
        fechamento: '📁 Fechamento',
        sangria: '💸 Sangria',
        reforco: '💰 Reforço',
        recebimento_fiado: '✅ Recebimento',
        entrada: '📦 Entrada Estoque'
    };
    return tipos[tipo] || tipo;
}