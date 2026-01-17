# Instagram Analyzer - Dockerfile para Railway
FROM node:20-slim

# Instalar Python e dependencias
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Criar diretorio da app
WORKDIR /app

# Copiar arquivos
COPY package*.json ./
RUN npm install

COPY . .

# Criar venv e instalar instaloader
RUN python3 -m venv venv && \
    ./venv/bin/pip install instaloader

# Expor porta
EXPOSE 3002

# Variavel de ambiente
ENV PORT=3002

# Iniciar servidor
CMD ["node", "server/index.js"]
