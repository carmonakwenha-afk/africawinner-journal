# ☁️ Guia Definitivo de Deploy no Google Cloud
## AfricaWinners Scientific Blog & Tech Hub (AWSJ)
**Fundador & Mentor:** Valdimir Jacinto Esteves  
**Contacto:** 976161521 | **E-mail:** escritorioestevesemultisservic@gmail.com  
**Modelo:** Blog Científico & Tech Hub • Acesso Aberto Comunitário • Certificação Oficial Exclusiva para Artigos

---

## 🌟 Por que o Google Cloud Run é a Melhor Escolha?

O **Google Cloud Run** é a plataforma serverless moderna da Google, ideal para aplicações Node.js:
* **Cota Gratuita Generosa:** A Google oferece **2 milhões de requisições mensais gratuitas** todo mês.
* **Custo Zero em Inatividade:** Quando ninguém estiver a navegar no portal, o container escala automaticamente para zero instâncias.
* **HTTPS / SSL Automático:** Gera de imediato um certificado SSL de alta segurança oficial da Google (`https://africawinner-hub-xxxx.a.run.app`).
* **Domínio Próprio Facilitado:** Permite ligar domínios próprios (ex: `africawinners.org`, `africawinner.ao`) em poucos cliques com certificado SSL gerado e renovado pela Google.

---

## 🚀 MÉTODO 1 (Recomendado): Deploy pelo Google Cloud Shell (No Navegador)

Você **não precisa de instalar nada no seu computador**. Pode fazer todo o processo diretamente pelo navegador através do terminal do Google Cloud.

### Passo 1: Aceder à Consola do Google Cloud
1. Aceda a [https://console.cloud.google.com](https://console.cloud.google.com) com a sua conta Google.
2. No topo da página, crie ou selecione o seu projeto (exemplo: `africawinner-hub` ou `africawinner-portal`).

### Passo 2: Ativar o Google Cloud Shell
1. No canto superior direito da consola, clique no ícone **Ativar o Cloud Shell** (`>_`).
2. Uma barra de terminal Linux abrirá diretamente na parte inferior do seu navegador.

### Passo 3: Colocar o Código no Cloud Shell

**Opção A — Se tem o código no GitHub:**
No terminal do Cloud Shell, execute:
```bash
git clone https://github.com/SEU_USUARIO/africawinner-journal.git
cd africawinner-journal
```

**Opção B — Envio direto pelo Navegador:**
1. No seu computador, compacte a pasta `africawinner-journal` num arquivo `.zip` (não precisa incluir `node_modules`).
2. No Cloud Shell, clique no menu de três pontos (`⋮`) no canto superior direito do terminal e clique em **Upload (Carregar arquivo)**.
3. Escolha o ficheiro `.zip` e aguarde o upload terminar.
4. Descompacte no terminal:
```bash
unzip africawinner-journal.zip -d africawinner-journal
cd africawinner-journal
```

### Passo 4: Executar o Comando de Deploy
Execute o seguinte comando único no terminal do Cloud Shell:

```bash
gcloud run deploy africawinner-hub \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,JWT_SECRET=awsj_secret_esteves_2026,JOURNAL_FOUNDER="Valdimir Jacinto Esteves",JOURNAL_PHONE="976161521",JOURNAL_EMAIL="escritorioestevesemultisservic@gmail.com"
```

> **Nota:** Se for a primeira vez que publica no projeto, o Google Cloud perguntará se deseja ativar as APIs do **Cloud Build**, **Cloud Run** e **Artifact Registry**. Basta pressionar `y` (yes) e `Enter`.

### Passo 5: Portal no Ar! 🎉
O Google Cloud irá compilar o container Docker em múltiplos estágios e fornecerá o link público seguro:
```text
Service URL: https://africawinner-hub-w3kxyz-ew.a.run.app
```
O portal estará imediatamente online, com acesso à base de dados, mentoria, submissão de publicações, galeria fotográfica, vídeos e emissão de certificados oficiais!

---

## 🔄 MÉTODO 2: Deploy Contínuo Automático com GitHub (CI/CD)

Se você preferir que o portal seja atualizado automaticamente a cada alteração no GitHub:

1. Na consola do Google Cloud, pesquise por **Cloud Run**.
2. Clique no botão **Criar Serviço** (ou selecione `africawinner-hub`).
3. Em *Método de Implantação*, selecione: **«Implantar continuamente novas revisões de um repositório de controle de código-fonte»**.
4. Clique em **Configurar com o Cloud Build**.
5. Conecte a sua conta do GitHub e selecione o repositório `africawinner-journal` e o branch `main`.
6. Em tipo de build, selecione **Dockerfile** (já preparado na raiz do projeto).
7. Clique em **Salvar**. A partir de agora, qualquer alteração que enviar para o GitHub será implantada no Google Cloud automaticamente em menos de 2 minutos!

---

## 🌐 MÉTODO 3: Deploy via Google App Engine (Alternativa Tradicional)

Se preferir utilizar o Google App Engine com o arquivo [`app.yaml`](./app.yaml):

1. No Cloud Shell ou terminal local:
```bash
gcloud app create --region=europe-west
gcloud app deploy app.yaml --quiet
```
2. O site ficará online em:
```text
https://[SEU-ID-DE-PROJETO].appspot.com
```

---

## 🔒 Como Conectar o seu Próprio Domínio (ex: `africawinners.org`)

1. Na consola do Google Cloud, aceda à página do **Cloud Run**.
2. Clique no menu superior em **Gerenciar domínios personalizados** (*Manage Custom Domains*).
3. Clique em **Adicionar Mapeamento** (*Add Mapping*).
4. Selecione o serviço `africawinner-hub` e digite o seu domínio (ex: `portal.africawinners.org` ou `africawinners.org`).
5. A Google fornecerá os registros DNS (tipo `A`, `AAAA` ou `CNAME`) para colocar na sua entidade registradora de domínio.
6. A Google emitirá o certificado SSL mundial automaticamente em poucos minutos.

---

## 🔑 Configuração Opcional: Google OAuth 2.0 (Login com Conta Google)

O portal já suporta autenticação com Google OAuth. Se desejar ativar o botão de login com Google:
1. No Google Cloud Console, aceda a **APIs e Serviços > Credenciais**.
2. Clique em **Criar Credenciais > ID do cliente OAuth**.
3. Tipo de aplicação: **Aplicativo da Web**.
4. Em **Origens JavaScript autorizadas**, adicione a URL do seu Cloud Run (ex: `https://africawinner-hub-xxxx.a.run.app`).
5. Copie o **Client ID** gerado.
6. No Cloud Run, adicione a variável de ambiente:
   `GOOGLE_CLIENT_ID = SEU_CLIENT_ID_COPIADO`

---

## 🛠️ Arquivos de Configuração Prontos no Projeto

* [`Dockerfile`](./Dockerfile) — Arquivo de container em 2 estágios (builder leve e runner otimizado).
* [`.dockerignore`](./.dockerignore) — Impede o envio de pastas pesadas locais para a nuvem.
* [`.gcloudignore`](./.gcloudignore) — Otimiza e acelera a subida de arquivos para o Cloud Shell.
* [`cloudbuild.yaml`](./cloudbuild.yaml) — Pipeline automatizado de integração e entrega contínua.
* [`app.yaml`](./app.yaml) — Configuração padrão pronta para o Google App Engine.
* [`server.js`](./server.js) — Vinculação a `0.0.0.0` e escuta na porta `PORT` injetada pelo Cloud Run.
* [`database.js`](./database.js) — Suporte ao caminho de banco de dados configurável via `DATABASE_PATH`.
