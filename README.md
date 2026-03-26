# 🥩 Açougue Duas Portas - Sistema PDV & CRM

<p align="center">
  <img src="assets/icons/icon-192.png" alt="Logo Açougue Duas Portas" width="120"/>
</p>

<p align="center">
  <strong>Sistema completo de gestão para açougues</strong><br>
  PDV • CRM • Estoque • Financeiro • Relatórios
</p>

<p align="center">
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-demonstração">Demo</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-uso">Como Usar</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/versão-1.0.0-blue" alt="Versão"/>
  <img src="https://img.shields.io/badge/licença-MIT-green" alt="Licença"/>
  <img src="https://img.shields.io/badge/PWA-ready-purple" alt="PWA"/>
  <img src="https://img.shields.io/badge/offline-suportado-orange" alt="Offline"/>
</p>

---

## 📋 Sobre o Projeto

O **Açougue Duas Portas** é um sistema web progressivo (PWA) completo para gestão de açougues e casas de carnes. Desenvolvido com foco em praticidade, funciona 100% offline e pode ser instalado como aplicativo no celular ou computador.

### ✨ Destaques

- 🚀 **100% Offline** - Funciona sem internet após primeiro acesso
- 📱 **PWA** - Instale como app no celular ou desktop
- 💾 **Dados Locais** - Armazenamento seguro no navegador (IndexedDB)
- 🎨 **Design Moderno** - Interface responsiva e intuitiva
- 🔒 **Multi-usuário** - Sistema de login com níveis de permissão
- 📊 **Relatórios** - Gráficos e exportação de dados

---

## 🎯 Funcionalidades

### 💰 PDV (Ponto de Venda)
- ✅ Catálogo visual de produtos por categoria
- ✅ Busca rápida de produtos
- ✅ Carrinho de compras intuitivo
- ✅ Múltiplas formas de pagamento (Dinheiro, PIX, Cartão, Fiado)
- ✅ Cálculo automático de troco
- ✅ Aplicação de descontos (% ou valor fixo)
- ✅ Geração de comprovante/recibo
- ✅ Venda por peso (Kg) ou unidade

### 👥 CRM (Gestão de Clientes)
- ✅ Cadastro completo de clientes
- ✅ Sistema de fiado com limite de crédito
- ✅ Programa de fidelidade (pontos por compra)
- ✅ Histórico de compras por cliente
- ✅ Alertas de fiado alto
- ✅ Busca e filtros avançados

### 📦 Controle de Estoque
- ✅ Cadastro de produtos com categorias
- ✅ Controle de validade
- ✅ Alertas de estoque baixo
- ✅ Alertas de produtos próximos ao vencimento
- ✅ Registro de entradas de mercadoria
- ✅ Preço de custo e venda

### 💵 Financeiro
- ✅ Abertura e fechamento de caixa
- ✅ Sangria e reforço de caixa
- ✅ Recebimento de fiados
- ✅ Movimentações do dia
- ✅ Conferência de caixa com diferença
- ✅ Histórico de operações

### 📊 Relatórios
- ✅ Vendas por período
- ✅ Gráfico de vendas da semana
- ✅ Vendas por categoria (pizza chart)
- ✅ Vendas por forma de pagamento
- ✅ Top 5 produtos mais vendidos
- ✅ Exportação para CSV

### ⚙️ Configurações
- ✅ Dados da empresa
- ✅ Gerenciamento de usuários
- ✅ Permissões por cargo
- ✅ Configurações do sistema
- ✅ Backup e restauração de dados
- ✅ Limpeza de dados

---

## 🖥️ Demonstração

### Credenciais de Acesso

| Usuário | Senha | Cargo |
|---------|-------|-------|
| `admin` | `admin123` | Administrador |
| `gerente` | `gerente123` | Gerente |
| `caixa` | `caixa123` | Operador de Caixa |

### Screenshots

<details>
<summary>📸 Ver Screenshots</summary>

#### Dashboard
![Dashboard](screenshots/dashboard.png)

#### PDV
![PDV](screenshots/pdv.png)

#### Clientes
![Clientes](screenshots/clientes.png)

#### Estoque
![Estoque](screenshots/estoque.png)

</details>

---

## 🚀 Instalação

### Opção 1: GitHub Pages (Online)

1. Faça um **Fork** deste repositório
2. Vá em **Settings** > **Pages**
3. Selecione a branch `main` e salve
4. Acesse: `https://seu-usuario.github.io/acougue-duas-portas`

### Opção 2: Servidor Local

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/acougue-duas-portas.git

# Entre na pasta
cd acougue-duas-portas

# Inicie um servidor local (escolha uma opção)

# Opção A: Python 3
python -m http.server 8000

# Opção B: Node.js
npx serve

# Opção C: PHP
php -S localhost:8000
