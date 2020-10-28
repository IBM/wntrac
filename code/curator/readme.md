#  WNTRAC Curator

WNTRAC Curator uses angular 8 for client side rendering and flask to build API. The default database is PostgreSQL.
The app allows user to validate candidate evidences generated using pipeline.


## Build docker image

[Docker](https://www.docker.com/) is a pre-requisite to run WNTRAC curator app. To build docker image, cd to the code directory with Dockerfile and run:
```bash
docker build -t wntrac .
```
Docker will take care of production build of angular app, and setting the right environment for flask

## Run docker container

Before you run, you will need database credentials and path to data folder (for crawled pages). Please add these details to `.env` file

The following command runs the server on port 80. 
```bash
docker run -it -p 80:80  --env-file sample.env wntrac
```
Once docker container is running, please go to http://localhost on your browser

Replace the port number before `:` to change the port to access from your localhost. You can also run docker in deamon mode.


## Other notes

For development purpose, mount your working directory. This will build changes to flask app with every code change.
```bash
docker run -it -v "`pwd`:/usr/src/curation" -p 80:80  --env-file sample.env   wntrac
```