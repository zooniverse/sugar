FROM node:11

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && \
    apt-get install --no-install-recommends -y supervisor && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /node_app

COPY package.json /node_app/
RUN npm install .

COPY docker/supervisor.conf /etc/supervisor/conf.d/sugar.conf

COPY . /node_app

EXPOSE 2999

ENTRYPOINT /usr/bin/supervisord
