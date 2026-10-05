# AfricaWinners Scientific Blog & Tech Hub (AWSJ)

**Portal Comunitário & Tech Hub de Inovação Aberta (Robótica, STEM, IA & Artigos)**  
*Inspirado no modelo Empowered Voices – Em evolução progressiva para Revista Científica Internacional de Alto Calibre.*

---

## 🏛️ Informações Institucionais & Governança

* **Fundador & Mentor:** Valdimir Jacinto Esteves
* **Entidade:** Escritório Esteves & Multi-Serviços / AfricaWinners
* **E-mail Institucional:** [escritorioestevesemultisservic@gmail.com](mailto:escritorioestevesemultisservic@gmail.com)
* **Contacto Telefónico:** 976161521 (Angola)
* **ISSN:** 2959-1082 (Online)
* **Modelo de Publicação:** Acesso Aberto Comunitário & Mentoria Científica (Com Certificado Oficial)
* **Idiomas:** Português 🇵🇹, Inglês 🇬🇧, Francês 🇫🇷
* **Roadmap:** Fase 1: Blog & Tech Hub Comunitário ➔ Fase 2: Revista Científica Internacional de Alto Calibre

---

## 🚀 Arquitetura Técnica do Sistema

```
africawinner-journal/
├── package.json               # Dependências do backend (Express, SQLite3, Multer, Google Auth)
├── server.js                  # Servidor Express REST API com rotas de auth e artigos
├── database.js                # Base de dados SQLite relacional e seeds iniciais
├── journal.db                 # Ficheiro de base de dados SQLite gerado automaticamente
├── .env.example               # Configurações e chaves do Google OAuth 2.0
├── uploads/                   # Armazenamento seguro dos PDFs dos artigos submetidos
└── public/                    # Interface Visual (Front-End)
    ├── index.html             # Portal principal responsivo
    ├── css/
    │   └── style.css          # Design System editorial de alto padrão (Navy & Gold)
    ├── js/
    │   └── app.js             # Lógica de cliente, Google OAuth 2.0, catálogo e submissão
    └── assets/
        └── hero-science.jpg   # Imagem oficial de destaque (Ciência e Juventude Africana)
```

---

## 🛠️ Como Executar o Projeto

### 1. Pré-requisitos
Certifique-se de que tem o **Node.js** instalado na sua máquina. Se ainda não tiver instalado, pode instalar via terminal:
```powershell
winget install OpenJS.NodeJS.LTS
```

### 2. Instalação das Dependências
Na pasta `africawinner-journal`, execute:
```bash
npm install
```

### 3. Iniciar o Servidor
```bash
npm start
```
O portal estará disponível em: **`http://localhost:3000`**

---

## 🔑 Configuração do Google OAuth 2.0

Para ativar o login real com contas Google:
1. Aceda ao [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto chamado **"AfricaWinners Journal"**.
3. Em **APIs & Services > Credentials**, clique em **Create Credentials > OAuth client ID**.
4. Selecione o tipo de aplicação como **Web Application**.
5. Adicione em *Authorized JavaScript origins*: `http://localhost:3000` (e o domínio de produção).
6. Copie o seu **Client ID** e substitua no arquivo `server.js` e em `.env`.

---

## 📚 Endpoints da API REST

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` | Registo de novos autores com e-mail acadêmico |
| `POST` | `/api/auth/login` | Autenticação padrão de utilizador |
| `POST` | `/api/auth/google` | Autenticação e provisionamento via Google OAuth 2.0 |
| `GET` | `/api/auth/me` | Dados do utilizador autenticado |
| `GET` | `/api/articles` | Listagem e busca de artigos científicos publicados |
| `POST` | `/api/articles/submit` | Submissão de novo manuscrito com upload de PDF |
| `GET` | `/api/articles/track` | Consulta do status de revisão pelo e-mail do autor |
| `GET` | `/api/articles/:id/download` | Download do arquivo PDF do artigo |
| `GET` | `/api/journal/stats` | Estatísticas e métricas de impacto do periódico |

---

## 🌐 Publicação Online na Nuvem (Google Cloud Firebase & Render)

O projeto está pronto para publicação imediata com alta velocidade e segurança SSL HTTPS inclusa:
* **Google Cloud Firebase (Recomendado):** Consulte o guia passo a passo em [DEPLOY_FIREBASE.md](DEPLOY_FIREBASE.md) utilizando os ficheiros `firebase.json` e `.firebaserc`.
* **Render.com:** Consulte o guia em [DEPLOY_RENDER.md](DEPLOY_RENDER.md) ou use o ficheiro [render.yaml](render.yaml).

---

## 🎥 Mídia Kit & Cobertura de Atividades
* O portal inclui a secção dedicada de **Mídia Kit & Cobertura de Eventos** (sem valores expostos publicamente).
* Os acordos institucionais e coberturas de conferências, hackathons e semanas tecnológicas são alinhados diretamente via e-mail com a liderança do Mentor **Valdimir Jacinto Esteves** (`escritorioestevesemultisservic@gmail.com`).

---

## 📜 Licença e Direitos Autorais

© 2026 **AfricaWinners Scientific Journal (AWSJ)**. Todos os direitos reservados.  
Fundado por **Valdimir Jacinto Esteves**.
