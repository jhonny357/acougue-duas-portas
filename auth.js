// ===== SISTEMA DE AUTENTICAÇÃO =====
const Auth = {
    currentUser: null,
    
    // Verificar login
    async login(username, password) {
        const usuarios = await DB.getAll('usuarios');
        const user = usuarios.find(u => 
            u.login.toLowerCase() === username.toLowerCase() && 
            u.senha === password && 
            u.ativo
        );
        
        if (user) {
            this.currentUser = {
                id: user.id,
                login: user.login,
                nome: user.nome,
                cargo: user.cargo
            };
            
            // Salvar sessão
            if (document.getElementById('remember-me').checked) {
                localStorage.setItem('session', JSON.stringify(this.currentUser));
            } else {
                sessionStorage.setItem('session', JSON.stringify(this.currentUser));
            }
            
            return { success: true, user: this.currentUser };
        }
        
        return { success: false, message: 'Usuário ou senha inválidos' };
    },
    
    // Verificar sessão
    checkSession() {
        const session = localStorage.getItem('session') || sessionStorage.getItem('session');
        if (session) {
            this.currentUser = JSON.parse(session);
            return true;
        }
        return false;
    },
    
    // Logout
    logout() {
        this.currentUser = null;
        localStorage.removeItem('session');
        sessionStorage.removeItem('session');
    },
    
    // Verificar permissão
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const permissions = {
            admin: ['all'],
            gerente: ['vendas', 'clientes', 'estoque', 'financeiro', 'relatorios'],
            caixa: ['vendas', 'clientes']
        };
        
        const userPermissions = permissions[this.currentUser.cargo] || [];
        return userPermissions.includes('all') || userPermissions.includes(permission);
    },
    
    // Verificar se é admin
    isAdmin() {
        return this.currentUser?.cargo === 'admin';
    }
};

// Toggle visibilidade da senha
function togglePassword() {
    const input = document.getElementById('login-pass');
    const icon = document.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Logout
function logout() {
    if (confirm('Deseja realmente sair?')) {
        Auth.logout();
        showLogin();
        showToast('Até logo!', 'info');
    }
}