# 🚀 Guia de Deploy no Render.com
### AfricaWinners Scientific Blog & Tech Hub (AWSJ)
**Fundador & Mentor:** Valdimir Jacinto Esteves  
**Email:** escritorioestevesemultisservic@gmail.com | **Tel:** 976161521  
**Modelo:** Acesso Aberto Comunitário (Com Certificado Oficial)

---

## 🎯 Por que o Render.com?
O **Render.com** é uma das melhores plataformas em nuvem para hospedar aplicações **Node.js**:
- ✅ **Plano Base Incluído** (Free Tier).
- ✅ **Suporte Total ao Full-Stack**: Executa o servidor Node.js + Express, banco de dados SQLite e todo o visual (HTML/CSS/JS).
- ✅ **Certificado SSL / HTTPS Automático**: Segurança com cadeado verde incluída.
- ✅ **Domínio Web Padrão**: Exemplo: `https://africawinner-journal.onrender.com`.
- ✅ **Possibilidade de Domínio Personalizado**: Pode ligar o seu próprio domínio (ex: `africawinners.ao` ou `.com`).

---

## 📋 Passo a Passo para o Deploy

### PASSO 1: Criar o Repositório no GitHub

1. Aceda a [https://github.com](https://github.com) e inicie sessão (ou crie uma conta).
2. No canto superior direito, clique em **`+`** e selecione **`New repository`**.
3. Dê o nome ao repositório: `africawinner-journal`.
4. Deixe marcado como **Public** (ou Private se preferir).
5. Clique em **`Create repository`**.

#### Se não tiver Git instalado no seu computador:
- Na página do repositório vazio que acabou de criar, clique no link **`uploading an existing file`**.
- Arraste todos os ficheiros da pasta:
  `C:\Users\DELL 5310\.gemini\antigravity\scratch\africawinner-journal`
  *(Atenção: Não envie a pasta `node_modules` se ela existir localmente).*
- Clique em **Commit changes**.

#### Se tiver o Git instalado:
No terminal da pasta do projeto, execute:
```bash
git init
git add .
git commit -m "AfricaWinners Empowered Voices deploy release"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO_GITHUB/africawinner-journal.git
git push -u origin main
```

---

### PASSO 2: Criar a Conta e o Serviço no Render.com

1. Aceda a [https://render.com](https://render.com) e clique em **`GET STARTED FOR FREE`** (ou **`Sign In`**).
2. Recomendamos iniciar sessão clicando em **`Continue with GitHub`** (assim as suas contas ficam conectadas automaticamente).
3. No painel principal do Render (Dashboard), clique no botão **`New +`** no topo da página.
4. Selecione **`Web Service`**.

---

### PASSO 3: Conectar o Repositório

1. Na lista de repositórios do GitHub, localize **`africawinner-journal`** e clique em **`Connect`**.
2. Preencha os campos de configuração:
   - **Name:** `africawinner-journal` (ou o nome que preferir para o link da sua revista).
   - **Region:** `Frankfurt (EU Central)` ou `Oregon (US West)`.
   - **Branch:** `main`.
   - **Runtime:** `Node`.
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Selecione **`Free`**.

---

### PASSO 4: Configurar as Variáveis de Ambiente (Environment Variables)

Ainda na página de configuração do Web Service, desça até a secção **Environment Variables** e adicione as seguintes chaves:

| Key | Value | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Modo de produção do Node.js |
| `JWT_SECRET` | `awsj_secret_token_valdimir_esteves_2026` | Chave de segurança para login seguro |
| `JOURNAL_FOUNDER` | `Valdimir Jacinto Esteves` | Nome do Fundador & Mentor |
| `JOURNAL_EMAIL` | `escritorioestevesemultisservic@gmail.com` | Email oficial |
| `JOURNAL_PHONE` | `976161521` | Contacto telefónico |

*(Opcional: Se tiver uma chave da OpenAI para o assistente de redação científica, pode adicionar `OPENAI_API_KEY` com a sua chave).*

---

### PASSO 5: Iniciar o Deploy

1. Clique no botão azul **`Create Web Service`** no final da página.
2. O Render iniciará o processo de download, instalação de dependências e inicialização do servidor.
3. Acompanhe os logs na tela. Quando aparecer:
   ```
   ==> Your service is live 🎉
   ```
4. O link público do seu portal aparecerá no topo da tela, por exemplo:  
   👉 **`https://africawinner-journal.onrender.com`**

---

### 🌐 Conectar Domínio Próprio (Opcional)
Se tiver um domínio personalizado (ex: `africawinners.com` ou `africawinners.ao`):
1. No painel do seu serviço no Render, vá em **`Settings` > `Custom Domains`**.
2. Clique em **`Add Custom Domain`** e digite o seu domínio.
3. Siga as instruções de DNS (adicionando um registo CNAME ou A no painel onde comprou o domínio).
4. O Render irá gerar o certificado SSL automaticamente.
