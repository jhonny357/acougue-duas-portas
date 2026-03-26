// ===== DATABASE LOCAL (IndexedDB + LocalStorage) =====
const DB = {
    name: 'AcougueDuasPortas',
    version: 1,
    
    // Inicializar banco de dados
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar stores
                if (!db.objectStoreNames.contains('produtos')) {
                    const produtosStore = db.createObjectStore('produtos', { keyPath: 'id', autoIncrement: true });
                    produtosStore.createIndex('codigo', 'codigo', { unique: true });
                    produtosStore.createIndex('categoria', 'categoria', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('clientes')) {
                    const clientesStore = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
                    clientesStore.createIndex('telefone', 'telefone', { unique: false });
                    clientesStore.createIndex('cpf', 'cpf', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('vendas')) {
                    const vendasStore = db.createObjectStore('vendas', { keyPath: 'id', autoIncrement: true });
                    vendasStore.createIndex('data', 'data', { unique: false });
                    vendasStore.createIndex('cliente', 'clienteId', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('movimentacoes')) {
                    const movStore = db.createObjectStore('movimentacoes', { keyPath: 'id', autoIncrement: true });
                    movStore.createIndex('data', 'data', { unique: false });
                    movStore.createIndex('tipo', 'tipo', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('usuarios')) {
                    db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    },
    
    // Operações genéricas
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add({ ...data, createdAt: new Date().toISOString() });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ ...data, updatedAt: new Date().toISOString() });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },
    
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },
    
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // Exportar todos os dados
    async exportAll() {
        const data = {
            produtos: await this.getAll('produtos'),
            clientes: await this.getAll('clientes'),
            vendas: await this.getAll('vendas'),
            movimentacoes: await this.getAll('movimentacoes'),
            usuarios: await this.getAll('usuarios'),
            config: JSON.parse(localStorage.getItem('config') || '{}'),
            exportDate: new Date().toISOString()
        };
        return data;
    },
    
    // Importar dados
    async importAll(data) {
        if (data.produtos) {
            await this.clear('produtos');
            for (const item of data.produtos) {
                await this.add('produtos', item);
            }
        }
        if (data.clientes) {
            await this.clear('clientes');
            for (const item of data.clientes) {
                await this.add('clientes', item);
            }
        }
        if (data.vendas) {
            await this.clear('vendas');
            for (const item of data.vendas) {
                await this.add('vendas', item);
            }
        }
        if (data.movimentacoes) {
            await this.clear('movimentacoes');
            for (const item of data.movimentacoes) {
                await this.add('movimentacoes', item);
            }
        }
        if (data.usuarios) {
            await this.clear('usuarios');
            for (const item of data.usuarios) {
                await this.add('usuarios', item);
            }
        }
        if (data.config) {
            localStorage.setItem('config', JSON.stringify(data.config));
        }
    }
};

// ===== DADOS INICIAIS =====
const dadosIniciais = {
    usuarios: [
        { login: 'admin', senha: 'admin123', nome: 'Administrador', cargo: 'admin', ativo: true },
        { login: 'caixa', senha: 'caixa123', nome: 'Operador de Caixa', cargo: 'caixa', ativo: true },
        { login: 'gerente', senha: 'gerente123', nome: 'Gerente', cargo: 'gerente', ativo: true }
    ],
    produtos: [
        { codigo: '001', nome: 'Picanha', categoria: 'bovino', preco: 89.90, custo: 65.00, estoque: 25, estoqueMin: 5, unidade: 'kg' },
        { codigo: '002', nome: 'Alcatra', categoria: 'bovino', preco: 54.90, custo: 38.00, estoque: 30, estoqueMin: 8, unidade: 'kg' },
        { codigo: '003', nome: 'Contra Filé', categoria: 'bovino', preco: 49.90, custo: 35.00, estoque: 35, estoqueMin: 10, unidade: 'kg' },
        { codigo: '004', nome: 'Maminha', categoria: 'bovino', preco: 52.90, custo: 36.00, estoque: 20, estoqueMin: 5, unidade: 'kg' },
        { codigo: '005', nome: 'Costela Bovina', categoria: 'bovino', preco: 32.90, custo: 22.00, estoque: 40, estoqueMin: 10, unidade: 'kg' },
        { codigo: '006', nome: 'Carne Moída', categoria: 'bovino', preco: 29.90, custo: 20.00, estoque: 25, estoqueMin: 8, unidade: 'kg' },
        { codigo: '007', nome: 'Acém', categoria: 'bovino', preco: 34.90, custo: 24.00, estoque: 30, estoqueMin: 8, unidade: 'kg' },
        { codigo: '008', nome: 'Patinho', categoria: 'bovino', preco: 42.90, custo: 30.00, estoque: 20, estoqueMin: 5, unidade: 'kg' },
        { codigo: '009', nome: 'Pernil Suíno', categoria: 'suino', preco: 18.90, custo: 12.00, estoque: 45, estoqueMin: 10, unidade: 'kg' },
        { codigo: '010', nome: 'Lombo Suíno', categoria: 'suino', preco: 24.90, custo: 16.00, estoque: 25, estoqueMin: 5, unidade: 'kg' },
        { codigo: '011', nome: 'Costela Suína', categoria: 'suino', preco: 19.90, custo: 13.00, estoque: 30, estoqueMin: 8, unidade: 'kg' },
        { codigo: '012', nome: 'Bacon', categoria: 'suino', preco: 45.90, custo: 32.00, estoque: 15, estoqueMin: 5, unidade: 'kg' },
        { codigo: '013', nome: 'Frango Inteiro', categoria: 'aves', preco: 12.90, custo: 8.00, estoque: 50, estoqueMin: 15, unidade: 'kg' },
        { codigo: '014', nome: 'Peito de Frango', categoria: 'aves', preco: 18.90, custo: 12.00, estoque: 35, estoqueMin: 10, unidade: 'kg' },
        { codigo: '015', nome: 'Coxa de Frango', categoria: 'aves', preco: 14.90, custo: 9.00, estoque: 40, estoqueMin: 10, unidade: 'kg' },
        { codigo: '016', nome: 'Asa de Frango', categoria: 'aves', preco: 16.90, custo: 11.00, estoque: 25, estoqueMin: 8, unidade: 'kg' },
        { codigo: '017', nome: 'Linguiça Toscana', categoria: 'embutidos', preco: 22.90, custo: 15.00, estoque: 20, estoqueMin: 8, unidade: 'kg' },
        { codigo: '018', nome: 'Linguiça Calabresa', categoria: 'embutidos', preco: 28.90, custo: 19.00, estoque: 18, estoqueMin: 5, unidade: 'kg' },
        { codigo: '019', nome: 'Salsicha', categoria: 'embutidos', preco: 15.90, custo: 10.00, estoque: 30, estoqueMin: 10, unidade: 'kg' },
        { codigo: '020', nome: 'Mortadela', categoria: 'embutidos', preco: 19.90, custo: 13.00, estoque: 25, estoqueMin: 8, unidade: 'kg' }
    ],
    clientes: [
        { nome: 'Maria da Silva', telefone: '(11) 99999-1111', cpf: '123.456.789-00', endereco: 'Rua das Flores, 123', limite: 500, fiado: 0, pontos: 150 },
        { nome: 'João Santos', telefone: '(11) 99999-2222', cpf: '987.654.321-00', endereco: 'Av. Principal, 456', limite: 300, fiado: 85.50, pontos: 80 },
        { nome: 'Ana Oliveira', telefone: '(11) 99999-3333', cpf: '456.789.123-00', endereco: 'Rua do Comércio, 789', limite: 200, fiado: 0, pontos: 220 },
        { nome: 'Pedro Costa', telefone: '(11) 99999-4444', cpf: '789.123.456-00', endereco: 'Travessa Norte, 321', limite: 400, fiado: 156.80, pontos: 45 },
        { nome: 'Carla Ferreira', telefone: '(11) 99999-5555', cpf: '321.654.987-00', endereco: 'Alameda Sul, 654', limite: 600, fiado: 0, pontos: 310 }
    ]
};

// Carregar dados iniciais
async function carregarDadosIniciais() {
    try {
        const usuarios = await DB.getAll('usuarios');
        if (usuarios.length === 0) {
            for (const user of dadosIniciais.usuarios) {
                await DB.add('usuarios', user);
            }
        }
        
        const produtos = await DB.getAll('produtos');
        if (produtos.length === 0) {
            for (const prod of dadosIniciais.produtos) {
                await DB.add('produtos', prod);
            }
        }
        
        const clientes = await DB.getAll('clientes');
        if (clientes.length === 0) {
            for (const cli of dadosIniciais.clientes) {
                await DB.add('clientes', cli);
            }
        }
        
        // Config padrão
        if (!localStorage.getItem('config')) {
            localStorage.setItem('config', JSON.stringify({
                nomeEmpresa: 'Açougue Duas Portas',
                telefone: '(11) 3333-3333',
                whatsapp: '(11) 99999-9999',
                endereco: 'Rua Principal, 100 - Centro',
                cnpj: '00.000.000/0001-00',
                pontosPorReal: 1,
                estoqueMinPadrao: 5,
                diasAlertaValidade: 3,
                som: true,
                confirmarVenda: true
            }));
        }
        
        console.log('✅ Dados iniciais carregados');
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
    }
}