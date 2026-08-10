FROM kong:3.8

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip curl python3-cryptography \
    && rm -rf /var/lib/apt/lists/*

COPY kong.yml.template render_kong_config.py entrypoint.sh /kong/
RUN chmod +x /kong/entrypoint.sh

USER kong
ENV KONG_DATABASE=off
ENV KONG_PROXY_ACCESS_LOG=/dev/stdout
ENV KONG_ADMIN_ACCESS_LOG=/dev/stdout
ENV KONG_PROXY_ERROR_LOG=/dev/stderr
ENV KONG_ADMIN_ERROR_LOG=/dev/stderr
ENV KONG_ADMIN_LISTEN=0.0.0.0:8001
ENV KONG_DECLARATIVE_CONFIG=/tmp/kong.yml

ENTRYPOINT ["/kong/entrypoint.sh"]
