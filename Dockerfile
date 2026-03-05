FROM node:20-slim

RUN npm install -g wrangler

WORKDIR /app

EXPOSE 8787

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npx", "wrangler", "dev", "--local", "--ip", "0.0.0.0"]
