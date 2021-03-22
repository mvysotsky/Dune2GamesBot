FROM mysql:8.0

ENV MYSQL_DATABASE="dunebot"
ENV MYSQL_ROOT_PASSWORD="dune-bot-root"
ENV MYSQL_USER="dune-bot"
ENV MYSQL_PASSWORD="devdbaccess"

# DB data backup, unpucks itself automaticly (https://docs.docker.com/engine/reference/builder/#add)
#ADD docker-entrypoint-initdb.d.tar.xz /

# Timezone settings
ENV TZ=Europe/Moscow
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone