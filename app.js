// ===== APLICAÇÃO PRINCIPAL =====

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar banco de dados
        await DB.init();
        await carregarDadosIniciais();
        
        // Verificar sessão
        if (Auth.checkSession()) {
            showApp();
        } else {
            showLogin();
        }
        
        // Esconder splash
        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('hidden');
        }, 1500);
        
        // Setup eventos
        setupEventListeners();
        
        // Atualizar relógio
        atualizarRelogio();
        setInterval(atualizarRelogio, 1000);
        
        // Verificar conexão
        verificarConexao();
        
        // Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(() => console.log('✅ Service Worker registrado'))
                .catch(err => console.log('❌ Erro no SW:', err));
        }
        
        // PWA Install
        setupPWAInstall();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
});

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-user').value;
        const password = document.getElementById('login-pass').value;
        
        const result = await Auth.login(username, password);
        
        if (result.success) {
            showApp();
            showToast(`Bem-vindo, ${result.user.nome}!`, 'success');
        } else {
            showToast(result.message, 'error');
        }
    });
    
    // Navegação
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
    
    // Config tabs
    document.querySelectorAll('.config-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.config-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.config-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`config-${btn.dataset.config}`).classList.add('active');
        });
    });
    
    // Form empresa
    document.getElementById('form-empresa')?.addEventListener('submit', (e) => {
        e.preventDefault();
        salvarConfigEmpresa();
    });
    
    // Form sistema
    document.getElementById('form-sistema')?.addEventListener('submit', (e) => {
        e.preventDefault();
        salvarConfigSistema();
    });
    
    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                fecharModal(modal.id);
            }
        });
    });
    
    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => fecharModal(m.id));
        }
        
        // F2 - PDV
        if (e.key === 'F2') {
            e.preventDefault();
            navigateTo('pdv');
        }
        
        // F4 - Finalizar venda
        if (e.key === 'F4') {
            e.preventDefault();
            finalizarVenda();
        }
    });
}

// Mostrar login
function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

// Mostrar app
function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // Atualizar info do usuário
    document.getElementById('sidebar-username').textContent = Auth.currentUser.nome;
    document.getElementById('sidebar-role').textContent = formatarCargo(Auth.currentUser.cargo);
    
    // Mostrar/ocultar opções admin
    const adminItems = document.querySelectorAll('.admin-only');
    adminItems.forEach(item => {
        item.style.display = Auth.isAdmin() ? 'block' : 'none';
    });
    
    // Carregar dashboard
    navigateTo('dashboard');
}

// Navegação
async function navigateTo(page) {
    // Atualizar sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Atualizar título
    const titulos = {
        dashboard: 'Dashboard',
        pdv: 'PDV - Vendas',
        clientes: 'Clientes',
        estoque: 'Estoque',
        financeiro: 'Financeiro',
        relatorios: 'Relatórios',
        configuracoes: 'Configurações'
    };
    document.getElementById('page-title').textContent = titulos[page] || page;
    
    // Mostrar página
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    
    // Fechar sidebar no mobile
    if (window.innerWidth < 992) {
        document.getElementById('sidebar').classList.remove('open');
    }
    
    // Carregar dados da página
    switch (page) {
        case 'dashboard':
            await carregarDashboard();
            break;
        case 'pdv':
            await carregarProdutosPDV();
            await carregarClientesPDV();
            break;
        case 'clientes':
            await carregarClientes();
            break;
        case 'estoque':
            await carregarEstoque();
            break;
        case 'financeiro':
            await carregarFinanceiro();
            break;
        case 'relatorios':
            await atualizarRelatorios();
            break;
        case 'configuracoes':
            await carregarConfiguracoes();
            await carregarUsuarios();
            break;
    }
}

// Carregar dashboard
async function carregarDashboard() {
    const hoje = new Date().toISOString().split('T')[0];
    const vendas = await DB.getAll('vendas');
    const clientes = await DB.getAll('clientes');
    const produtos = await DB.getAll('produtos');
    
    // Vendas hoje
    const vendasHoje = vendas.filter(v => v.data.split('T')[0] === hoje);
    const totalHoje = vendasHoje.reduce((sum, v) => sum + v.total, 0);
    
    document.getElementById('dash-vendas-hoje').textContent = `R$ ${formatarMoeda(totalHoje)}`;
    document.getElementById('dash-qtd-vendas').textContent = `${vendasHoje.length} vendas`;
    
    // Clientes
    document.getElementById('dash-clientes').textContent = clientes.length;
    
    // Produtos
    const produtosBaixos = produtos.filter(p => p.estoque <= p.estoqueMin);
    document.getElementById('dash-produtos').textContent = produtos.length;
    document.getElementById('dash-estoque-baixo').textContent = `${produtosBaixos.length} em baixa`;
    
    // Fiados
    const totalFiados = clientes.reduce((sum, c) => sum + (c.fiado || 0), 0);
    const clientesComFiado = clientes.filter(c => c.fiado > 0).length;
    document.getElementById('dash-fiados').textContent = `R$ ${formatarMoeda(totalFiados)}`;
    document.getElementById('dash-qtd-fiados').textContent = `${clientesComFiado} clientes`;
    
    // Gráfico
    await renderizarGraficoDashboard();
    
    // Top produtos
    await carregarTopProdutos(vendas);
    
    // Últimas vendas
    carregarUltimasVendas(vendas);
    
    // Alertas
    carregarAlertas(produtos, clientes);
}

// Carregar top produtos
async function carregarTopProdutos(vendas) {
    const produtos = await DB.getAll('produtos');
    const contagem = {};
    
    vendas.forEach(v => {
        v.itens.forEach(item => {
            contagem[item.id] = (contagem[item.id] || 0) + item.quantidade;
        });
    });
    
    const top5 = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, qtd]) => {
            const prod = produtos.find(p => p.id === parseInt(id));
            return { nome: prod?.nome || 'Produto', quantidade: qtd };
        });
    
    const container = document.getElementById('top-produtos-list');
    
    if (top5.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma venda registrada</p>';
        return;
    }
    
    container.innerHTML = top5.map((p, i) => `
        <div class="top-produto-item">
            <span>${i + 1}. ${p.nome}</span>
            <span>${p.quantidade.toFixed(2)} kg</span>
        </div>
    `).join('');
}

// Carregar últimas vendas
function carregarUltimasVendas(vendas) {
    const container = document.getElementById('ultimas-vendas-list');
    const ultimas = vendas.slice(-5).reverse();
    
    if (ultimas.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma venda registrada</p>';
        return;
    }
    
    container.innerHTML = ultimas.map(v => `
        <div class="venda-item">
            <div>
                <strong>${v.clienteNome}</strong><br>
                <small>${new Date(v.data).toLocaleString('pt-BR')}</small>
            </div>
            <span>R$ ${formatarMoeda(v.total)}</span>
        </div>
    `).join('');
}

// Carregar alertas
function carregarAlertas(produtos, clientes) {
    const container = document.getElementById('alertas-list');
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    const alertas = [];
    
    // Estoque baixo
    produtos.filter(p => p.estoque <= p.estoqueMin).forEach(p => {
        alertas.push({
            tipo: 'warning',
            icone: 'fa-box',
            mensagem: `Estoque baixo: ${p.nome} (${p.estoque.toFixed(2)} ${p.unidade})`
        });
    });
    
    // Validade próxima
    produtos.filter(p => p.validade && diasAteValidade(p.validade) <= (config.diasAlertaValidade || 3) && diasAteValidade(p.validade) > 0).forEach(p => {
        alertas.push({
            tipo: 'warning',
            icone: 'fa-calendar-times',
            mensagem: `Validade próxima: ${p.nome} (${diasAteValidade(p.validade)} dias)`
        });
    });
    
    // Produtos vencidos
    produtos.filter(p => p.validade && diasAteValidade(p.validade) <= 0).forEach(p => {
        alertas.push({
            tipo: 'danger',
            icone: 'fa-exclamation-circle',
            mensagem: `VENCIDO: ${p.nome}`
        });
    });
    
    // Fiados altos
    clientes.filter(c => c.fiado >= c.limite * 0.8 && c.fiado > 0).forEach(c => {
        alertas.push({
            tipo: 'warning',
            icone: 'fa-hand-holding-usd',
            mensagem: `Fiado alto: ${c.nome} (R$ ${formatarMoeda(c.fiado)})`
        });
    });
    
    if (alertas.length === 0) {
        container.innerHTML = '<p class="empty-message">✅ Nenhum alerta no momento</p>';
        return;
    }
    
    container.innerHTML = alertas.map(a => `
        <div class="alerta-item ${a.tipo}">
            <i class="fas ${a.icone}"></i>
            ${a.mensagem}
        </div>
    `).join('');
}

// Toggle Sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Atualizar relógio
function atualizarRelogio() {
    const agora = new Date();
    document.getElementById('current-date').textContent = agora.toLocaleDateString('pt-BR');
    document.getElementById('current-time').textContent = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Verificar conexão
function verificarConexao() {
    const status = document.getElementById('connection-status');
    
    const updateStatus = () => {
        if (navigator.onLine) {
            status.classList.remove('offline');
            status.title = 'Online';
        } else {
            status.classList.add('offline');
            status.title = 'Offline';
        }
    };
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

// Abrir modal
function abrirModal(id) {
    document.getElementById(id).classList.add('active');
}

// Fechar modal
function fecharModal(id) {
    document.getElementById(id).classList.remove('active');
    document.getElementById('confirmar-btn').style.display = 'inline-flex';
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const msg = toast.querySelector('.toast-message');
    
    toast.className = `toast ${type}`;
    msg.textContent = message;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    icon.className = `toast-icon fas ${icons[type] || icons.info}`;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Formatar moeda
function formatarMoeda(valor) {
    return (valor || 0).toFixed(2).replace('.', ',');
}

// Formatar pagamento
function formatarPagamento(tipo) {
    const tipos = {
        dinheiro: '💵 Dinheiro',
        pix: '📱 PIX',
        debito: '💳 Débito',
        credito: '💳 Crédito',
        fiado: '📝 Fiado'
    };
    return tipos[tipo] || tipo;
}

// Formatar cargo
function formatarCargo(cargo) {
    const cargos = {
        admin: 'Administrador',
        gerente: 'Gerente',
        caixa: 'Operador de Caixa'
    };
    return cargos[cargo] || cargo;
}

// Som
function playSound(type) {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    if (!config.som) return;
    
    // Criar som simples usando Web Audio API
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === 'beep') {
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
        } else if (type === 'success') {
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
        }
        
        gainNode.gain.value = 0.1;
        oscillator.start();
        
        setTimeout(() => {
            oscillator.stop();
        }, 100);
    } catch (e) {
        // Ignorar erros de áudio
    }
}

// ===== CONFIGURAÇÕES =====
function carregarConfiguracoes() {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    
    document.getElementById('cfg-nome').value = config.nomeEmpresa || 'Açougue Duas Portas';
    document.getElementById('cfg-cnpj').value = config.cnpj || '';
    document.getElementById('cfg-telefone').value = config.telefone || '';
    document.getElementById('cfg-whatsapp').value = config.whatsapp || '';
    document.getElementById('cfg-endereco').value = config.endereco || '';
    
    document.getElementById('cfg-pontos').value = config.pontosPorReal || 1;
    document.getElementById('cfg-estoque-min').value = config.estoqueMinPadrao || 5;
    document.getElementById('cfg-validade-alerta').value = config.diasAlertaValidade || 3;
    document.getElementById('cfg-som').checked = config.som !== false;
    document.getElementById('cfg-confirmar-venda').checked = config.confirmarVenda !== false;
}

function salvarConfigEmpresa() {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    
    config.nomeEmpresa = document.getElementById('cfg-nome').value;
    config.cnpj = document.getElementById('cfg-cnpj').value;
    config.telefone = document.getElementById('cfg-telefone').value;
    config.whatsapp = document.getElementById('cfg-whatsapp').value;
    config.endereco = document.getElementById('cfg-endereco').value;
    
    localStorage.setItem('config', JSON.stringify(config));
    showToast('Configurações salvas!', 'success');
}

function salvarConfigSistema() {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    
    config.pontosPorReal = parseInt(document.getElementById('cfg-pontos').value) || 1;
    config.estoqueMinPadrao = parseInt(document.getElementById('cfg-estoque-min').value) || 5;
    config.diasAlertaValidade = parseInt(document.getElementById('cfg-validade-alerta').value) || 3;
    config.som = document.getElementById('cfg-som').checked;
    config.confirmarVenda = document.getElementById('cfg-confirmar-venda').checked;
    
    localStorage.setItem('config', JSON.stringify(config));
    showToast('Configurações salvas!', 'success');
}

// ===== USUÁRIOS =====
async function carregarUsuarios() {
    const usuarios = await DB.getAll('usuarios');
    const tbody = document.getElementById('usuarios-tbody');
    
    tbody.innerHTML = usuarios.map(u => `
        <tr>
            <td><code>${u.login}</code></td>
            <td>${u.nome}</td>
            <td>${formatarCargo(u.cargo)}</td>
            <td>
                <span class="badge ${u.ativo ? 'badge-success' : 'badge-danger'}">
                    ${u.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td class="actions">
                <button class="btn-icon" onclick="editarUsuario(${u.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                ${u.login !== 'admin' ? `
                    <button class="btn-icon danger" onclick="excluirUsuario(${u.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function abrirModalUsuario() {
    document.getElementById('modal-usuario-titulo').textContent = 'Novo Usuário';
    document.getElementById('form-usuario').reset();
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-ativo').checked = true;
    abrirModal('modal-usuario');
}

async function editarUsuario(id) {
    const usuario = await DB.get('usuarios', id);
    
    document.getElementById('modal-usuario-titulo').textContent = 'Editar Usuário';
    document.getElementById('usuario-id').value = usuario.id;
    document.getElementById('usuario-nome').value = usuario.nome;
    document.getElementById('usuario-login').value = usuario.login;
    document.getElementById('usuario-senha').value = usuario.senha;
    document.getElementById('usuario-cargo').value = usuario.cargo;
    document.getElementById('usuario-ativo').checked = usuario.ativo;
    
    abrirModal('modal-usuario');
}

async function salvarUsuario() {
    const id = document.getElementById('usuario-id').value;
    const nome = document.getElementById('usuario-nome').value.trim();
    const login = document.getElementById('usuario-login').value.trim();
    const senha = document.getElementById('usuario-senha').value;
    
    if (!nome || !login || !senha) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    const usuario = {
        nome,
        login,
        senha,
        cargo: document.getElementById('usuario-cargo').value,
        ativo: document.getElementById('usuario-ativo').checked
    };
    
    try {
        if (id) {
            usuario.id = parseInt(id);
            await DB.update('usuarios', usuario);
            showToast('Usuário atualizado!', 'success');
        } else {
            await DB.add('usuarios', usuario);
            showToast('Usuário criado!', 'success');
        }
        
        fecharModal('modal-usuario');
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        showToast('Erro ao salvar usuário', 'error');
    }
}

async function excluirUsuario(id) {
    const usuario = await DB.get('usuarios', id);
    
    if (usuario.login === 'admin') {
        showToast('Não é possível excluir o administrador', 'error');
        return;
    }
    
    if (confirm(`Excluir usuário "${usuario.nome}"?`)) {
        await DB.delete('usuarios', id);
        showToast('Usuário excluído', 'success');
        carregarUsuarios();
    }
}

// ===== BACKUP =====
async function exportarBackup() {
    try {
        const data = await DB.exportAll();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_acougue_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showToast('Backup exportado!', 'success');
    } catch (error) {
        console.error('Erro ao exportar backup:', error);
        showToast('Erro ao exportar backup', 'error');
    }
}

async function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('Isso irá substituir todos os dados atuais. Deseja continuar?')) {
        event.target.value = '';
        return;
    }
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        await DB.importAll(data);
        
        showToast('Backup restaurado!', 'success');
        
        // Recarregar página
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Erro ao importar backup:', error);
        showToast('Erro ao importar backup', 'error');
    }
    
    event.target.value = '';
}

function limparDados() {
    if (!confirm('ATENÇÃO: Isso irá excluir TODOS os dados do sistema. Esta ação é IRREVERSÍVEL!\n\nDigite "CONFIRMAR" para continuar.')) {
        return;
    }
    
    const confirmacao = prompt('Digite "CONFIRMAR" para excluir todos os dados:');
    
    if (confirmacao === 'CONFIRMAR') {
        localStorage.clear();
        indexedDB.deleteDatabase('AcougueDuasPortas');
        
        showToast('Dados excluídos! Recarregando...', 'warning');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else {
        showToast('Operação cancelada', 'info');
    }
}

// ===== PWA INSTALL =====
let deferredPrompt;

function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Mostrar prompt após 30 segundos
        setTimeout(() => {
            if (deferredPrompt) {
                document.getElementById('install-prompt').classList.remove('hidden');
            }
        }, 30000);
    });
    
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        document.getElementById('install-prompt').classList.add('hidden');
        showToast('App instalado com sucesso!', 'success');
    });
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            deferredPrompt = null;
            document.getElementById('install-prompt').classList.add('hidden');
        });
    }
}

function dismissInstall() {
    document.getElementById('install-prompt').classList.add('hidden');
}