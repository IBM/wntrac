## Copyright 2020 IBM Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Pull base image
FROM python:3.7.7-slim

# update the packages in the base image
RUN apt-get update
# since we moved to slim version of docker image, we need to install neccessary packages
RUN  apt-get update && apt install -y gcc libmagic-dev

# Maintainer
MAINTAINER "Piyush Madan <Piyush.Madan1@ibm.com">

# install requirements.txt
RUN pip install Flask
RUN pip install psycopg2-binary  #for postgresql
RUN apt-get update
RUN python --version
COPY ./requirements.txt /usr/src/curation/requirements.txt
RUN pip install -r /usr/src/curation/requirements.txt


# Adding HTTPS  ## TODO: Can be removed if using Cloudfoundry / IBM Cloud to deploy
RUN apt-get install -y openssl
RUN pip install pyopenssl
RUN mkdir /usr/self_cert
RUN openssl req -x509 -newkey rsa:4096 -nodes -out /usr/self_cert/cert.pem -keyout /usr/self_cert/key.pem -days 365 -subj "/C=US/ST=Cambridge/L=Cambridge/O=IBM/OU=IBM/CN=ibm.com"

RUN apt-get install -y npm
RUN apt-get install -y nodejs
RUN npm install -g @angular/cli


# working directory
WORKDIR /usr/src/curation

COPY . /usr/src/curation

RUN ls -lah /usr/src/curation

WORKDIR /usr/src/curation/frontend

RUN ls

WORKDIR /usr/src/curation

RUN  cd /usr/src/curation/

EXPOSE 80

# TODO: Remove DEBUG and developpment env variables while deploying
# for flask specific environment variables (including app.py)
ENV  FLASK_APP app.py
ENV  FLASK_ENV development
ENV  FLASK_DEBUG 1

CMD python -m  flask run --host=0.0.0.0 --port 80
