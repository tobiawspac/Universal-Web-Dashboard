FROM node:20-alpine

WORKDIR /app

# dependencies first (cache)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# ensure runtime dirs exist (certs, data, plugins)
RUN mkdir -p certs data plugins && \
    if [ ! -f .env ]; then cp .env.example .env 2>/dev/null || echo "PORT=3000\nPASSWORD=admin123" > .env; fi && \
    if [ ! -f devices.json ]; then echo "[]" > devices.json; fi

EXPOSE 3000 3443

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

CMD ["node", "app.js"]
