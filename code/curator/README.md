#  WNTRAC Curator

WNTRAC Curator uses angular 8 for client side rendering and flask to build API. The default database is PostgreSQL.
The app allows user to validate candidate evidences generated using pipeline.


## Build docker image

[Docker](https://www.docker.com/) is a pre-requisite to run WNTRAC curator app. To build docker image, cd to the code directory with Dockerfile and run:
```bash
docker build -t wntrac .
```
Docker will take care of production build of angular app, and setting the right environment for flask

## Run docker containers

### Postgres docker container
Before running the above built wntrac image, run the below command in your machine from the terminal to pull PSQL from docker-hub.
```bash
docker run -d --name postgresql-wntrac -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres
```
Ensure the password you provide in the `POSTGRES_PASSWORD` field is similar to what is in the `sample.env`.

The port forwarding ensures that you can access the postgres server in the container from your local machine (Change the port if you have postgres running local).

Access the postgres database with e.g. [pgAdmin](https://www.pgadmin.org/download/), and create a local db with the name `ibmclouddb`.

### Wntrac docker container
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
