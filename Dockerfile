FROM ubuntu:24.04
RUN apt update -y
RUN apt upgrade -y

RUN apt install -y wget

RUN wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-9.0.0-amd64.deb
RUN wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-9.0.0-amd64.deb.sha512
RUN apt install -y perl adduser
RUN shasum -a 512 -c elasticsearch-9.0.0-amd64.deb.sha512
RUN dpkg -i elasticsearch-9.0.0-amd64.deb
RUN apt install -y sudo

COPY elasticsearch.yml /etc/elasticsearch/elasticsearch.yml
COPY docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

