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

# Maintainer
MAINTAINER "Piyush Madan <Piyush.Madan1 at ibm.com>"

# update the packages in the base image
RUN apt-get update
# since we moved to slim version of docker image, we need to install neccessary packages
RUN apt install -y gcc libmagic-dev


# install requirements.txt
# RUN pip install psycopg2-binary  #for postgresql
COPY ./requirements.txt /usr/src/curation/requirements.txt
RUN pip install -r /usr/src/curation/requirements.txt

COPY . /usr/src/curation

# Build angular app for production
WORKDIR /usr/src/curation/client
RUN apt-get install -y npm  nodejs
RUN npm install -g @angular/cli

RUN npm update
RUN export NODE_OPTIONS="--max_old_space_size=8096"
RUN npm run ng -- build --prod --progress=false --aot=true --vendor-chunk

RUN ls /usr/src/curation/client/dist

# Prepare flask app to run
WORKDIR /usr/src/curation
ENV  FLASK_APP app.py
ENV  FLASK_ENV production
CMD python -m  flask run --host=0.0.0.0 --port 80

EXPOSE 80
