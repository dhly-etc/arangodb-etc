docker stop timescaledb
docker rm timescaledb
docker run -d --name timescaledb -p 127.0.0.1:6432:5432 -e POSTGRES_PASSWORD=password timescale/timescaledb:latest-pg11

