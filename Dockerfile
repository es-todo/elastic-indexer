FROM ubuntu:24.04
RUN apt update -y
RUN apt upgrade -y

RUN apt install -y wget

RUN wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-9.0.0-amd64.deb
RUN wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-9.0.0-amd64.deb.sha512
RUN apt install -y perl adduser
RUN shasum -a 512 -c elasticsearch-9.0.0-amd64.deb.sha512
RUN dpkg -i elasticsearch-9.0.0-amd64.deb
RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install analysis-icu

RUN apt install -y sudo # needed in docker-entrypoint.sh

RUN wget https://deb.nodesource.com/setup_23.x
RUN bash setup_23.x
RUN apt install nodejs -y

RUN mkdir /app
WORKDIR /app

COPY ./package.json /app
COPY ./package-lock.json /app
RUN npm ci
COPY ./tsconfig.json /app
COPY ./src /app/src
RUN npm run check

COPY elasticsearch.yml /etc/elasticsearch/elasticsearch.yml
COPY docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

