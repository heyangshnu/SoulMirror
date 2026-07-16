ARG FATE_CONTAINER_BASE_IMAGE=docker.m.daocloud.io/library/node:22-trixie
FROM ${FATE_CONTAINER_BASE_IMAGE}

ARG PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/

USER root
WORKDIR /app

RUN sed -i 's#http://deb.debian.org/debian#https://mirrors.aliyun.com/debian#g; s#http://deb.debian.org/debian-security#https://mirrors.aliyun.com/debian-security#g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv python3-pip ca-certificates git gosu tini \
  && rm -rf /var/lib/apt/lists/*
RUN id -u smqt >/dev/null 2>&1 || useradd --create-home --shell /bin/bash smqt
RUN python3 -m venv /opt/basic-memory \
  && PIP_INDEX_URL=${PIP_INDEX_URL} /opt/basic-memory/bin/python -m pip install --timeout 120 --retries 5 basic-memory==0.22.0
RUN npm install -g @anthropic-ai/claude-code@1.0.128

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && npm prune --omit=dev \
  && mkdir -p /app/runtime /app/memory-projects \
  && chmod +x /app/scripts/container-entrypoint.sh \
  && chown -R smqt:smqt /app /opt/basic-memory

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV RUNTIME_ROOT=/app/runtime
ENV MEMORY_ROOT=/app/memory-projects
ENV HOME=/app/runtime/home
ENV TMPDIR=/app/runtime/tmp
ENV XDG_CACHE_HOME=/app/runtime/cache
ENV BUN_INSTALL_CACHE_DIR=/app/runtime/cache/bun-install
ENV NPM_CONFIG_CACHE=/app/runtime/cache/npm
ENV BASIC_MEMORY_BIN=/opt/basic-memory/bin/basic-memory
ENV CLAUDE_CODE_BIN=claude
ENV ARK_ANTHROPIC_BASE_URL=https://ark.cn-beijing.volces.com/api/plan
ENV PATH="/opt/basic-memory/bin:${PATH}"

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "const port=process.env.PORT||'8787'; fetch('http://127.0.0.1:'+port+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "./scripts/container-entrypoint.sh"]
