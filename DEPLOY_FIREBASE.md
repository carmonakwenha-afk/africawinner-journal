# 🔥 Guia Oficial de Publicação no Google Cloud via Firebase Hosting
## AfricaWinners Scientific Blog & Tech Hub (AWSJ)

Este guia prático explica passo a passo como colocar o portal **AfricaWinners** no ar utilizando o **Firebase Hosting**, o serviço de hospedagem de alto desempenho da Google Cloud.

---

## 🌟 Vantagens do Firebase Hosting

1. **Plano Spark da Google Cloud (Sem custos de servidor):**
   * Até 10 GB de armazenamento.
   * Até 360 MB/dia de transferência de dados (suficiente para milhares de acessos mensais sem custos).
2. **Segurança & Velocidade Máxima:**
   * Certificado **SSL (HTTPS)** gerado automaticamente pela Google.
   * Servido através da **CDN global da Google** com tempos de carregamento instantâneos em qualquer país.
3. **Domínio Personalizado com 1 Clique:**
   * Permite associar o seu domínio próprio (ex: `empoweredvoices.com`, `africawinners.org` ou `.com`).
4. **Deploy em Segundos:**
   * Atualizações futuras podem ser publicadas com um único comando: `firebase deploy`.

---

## 🛠️ Passo a Passo para Publicar

### Passo 1: Criar o Projeto no Console do Firebase
1. Aceda a: **[https://console.firebase.google.com/](https://console.firebase.google.com/)**
2. Inicie sessão com a sua conta Google (`escritorioestevesemultisservic@gmail.com` ou outra conta à sua escolha).
3. Clique em **"Adicionar projeto"** (ou *"Create a project"*).
4. Dê um nome ao projeto (exemplo: `africawinner-journal` ou `empowered-voices-tech`).
5. (Opcional) Pode desativar o Google Analytics se preferir rapidez, e clique em **Criar projeto**.

---

### Passo 2: Instalar a Ferramenta Firebase CLI no seu Computador
No seu terminal (PowerShell ou Prompt de Comando), instale o utilitário oficial da Google:
```powershell
npm install -g firebase-tools
```

---

### Passo 3: Autenticar com a sua Conta Google
No terminal, execute:
```powershell
firebase login
```
* O navegador abrirá automaticamente para você autorizar o acesso à sua conta Google.
* Após clicar em **Permitir**, feche a aba do navegador.

---

### Passo 4: Conectar ao seu Projeto Firebase
Na pasta do projeto (`africawinner-journal`), execute:
```powershell
firebase use --add
```
* Escolha na lista o projeto que acabou de criar no Console (ex: `africawinner-journal`).
* Quando pedir um alias, digite `default`.

---

### Passo 5: Fazer o Deploy para a Nuvem 🚀
Agora execute o comando de publicação:
```powershell
firebase deploy --only hosting
```

Em poucos segundos, o terminal apresentará a mensagem:
```text
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/seu-projeto/overview
Hosting URL: https://seu-projeto.web.app
```

**Pronto!** O portal estará online publicamente em `https://seu-projeto.web.app` e `https://seu-projeto.firebaseapp.com`.

---

## 🌐 Como Conectar o seu Domínio Próprio (Ex: `empoweredvoices.com`)

1. Aceda ao [Firebase Console](https://console.firebase.google.com/).
2. No menu lateral, clique em **Build (Construção) > Hosting**.
3. Clique no botão **"Adicionar domínio personalizado"** (*Add custom domain*).
4. Digite o seu domínio (ex: `empoweredvoices.com` ou `africawinners.com`).
5. O Firebase fornecerá 2 registos de DNS do tipo **A** ou **TXT** (endereços IP da Google).
6. Aceda à empresa onde registou o seu domínio (GoDaddy, Namecheap, etc.) e cole esses registos na secção de DNS.
7. O Firebase ativa automaticamente o certificado de segurança SSL (HTTPS) em até 24 horas.

---

## 🔄 Como Atualizar o Site no Futuro

Sempre que fizer alterações no portal:
1. Salve os arquivos em `public/`.
2. Execute no terminal:
```powershell
firebase deploy --only hosting
```
A atualização fica disponível instantaneamente no mundo inteiro!
