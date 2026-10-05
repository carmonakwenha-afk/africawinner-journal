# ==============================================================================
# 🐳 DOCKERFILE - AFRICAWINNERS SCIENTIFIC BLOG & TECH HUB (AWSJ)
# Otimizado para Google Cloud Run & Google Cloud Build
# Fundador & Mentor: Valdimir Jacinto Esteves
# ==============================================================================

# Estágio 1: Builder (instalação e compilação de dependências nativas se necessário)
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Instalar ferramentas de build necessárias para compilação nativa (sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de produção sem requerer package-lock prévio
RUN npm install --omit=dev

# ------------------------------------------------------------------------------
# Estágio 2: Runner final leve e ultra-rápido para Cloud Run
# ------------------------------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /usr/src/app

# Copiar apenas os módulos de produção construídos no estágio anterior
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copiar todo o código-fonte da aplicação
COPY . .

# Criar e assegurar permissões para pastas de dados e uploads
RUN mkdir -p uploads public/assets/templates && chmod -R 777 uploads

# Variáveis de ambiente padrão para o Google Cloud Run
ENV NODE_ENV=production
ENV PORT=8080

# Expor a porta 8080 (padrão de entrada do Cloud Run e App Engine)
EXPOSE 8080

# Checagem de integridade (Health Check)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/api/journal/stats', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })" || exit 1

# Comando de inicialização do servidor
CMD ["node", "server.js"]
