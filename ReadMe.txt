docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
docker-compose -f docker-compose.prod.yml up --build

If you want to build without using the cache and run it: 
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d

# Dev (with hot reload, mounts source volumes):
docker-compose -f docker-compose.dev.yml up --build

# Tear down (including volumes):
docker-compose -f docker-compose.dev.yml down -v

# To re-build a specific docker and run it when others are running: 
docker-compose -f docker-compose.dev.yml up -d --force-recreate web

prisma db push

To run Kafka without using docker:
> cd C:\kafka
> .\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
> .\bin\windows\kafka-server-start.bat .\config\kraft\server.properties

If Docker is running and there is/are database schema changes that should be pushed via Prisma migration,
run the application with Docker, then execute the commands below:
# 1. Regenerate the client inside both containers (writes into the anon node_modules volume)
docker compose -f docker-compose.dev.yml exec api    pnpm --filter @aba/database db:generate
docker compose -f docker-compose.dev.yml exec worker pnpm --filter @aba/database db:generate

# 2. Restart so the api entrypoint db-pushes the new tables and both reload the fresh client
docker compose -f docker-compose.dev.yml restart api worker

If an exec fails because a container is down, docker compose -f docker-compose.dev.yml up -d api worker first.

# See the real boot error first (should mention TestPage / Prisma):
docker compose -f docker-compose.dev.yml logs api --tail=100

# Regenerate the client in the container against the renamed schema, then restart:
docker compose -f docker-compose.dev.yml exec api    pnpm --filter @aba/database db:generate
docker compose -f docker-compose.dev.yml exec worker pnpm --filter @aba/database db:generate
docker compose -f docker-compose.dev.yml restart api worker

Avoid down -v / up --build as the fix — it works but wipes your Postgres volume (dev data loss). The commands above don't.


Inspect the topic's actual state:
> cd C:\kafka
> .\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --describe --topic package.scan
Look at the Leader: field — if it's -1 or missing, the partition has no leader (broken).

To make topics: 
cd C:\kafka
.\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic test.scheduled --partitions 10 --replication-factor 1
.\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic test.result --partitions 10 --replication-factor 1
.\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic package.scan --partitions 5 --replication-factor 1
.\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic vulnerability.fetched --partitions 5 --replication-factor 1
.\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic notification.req --partitions 3 --replication-factor 1

To list all topics:
.\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list

Describe one (check leader/ISR health):
.\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --describe --topic package.scan

To see the consumers: 
.\bin\windows\kafka-consumer-groups.bat --bootstrap-server localhost:9092 --list

To connect Github repo of aba-web to docker running application
Payload URL
http://localhost:8000/webhooks/github/d79db7fd-9d37-46a7-8b9c-174920a60694
https://wyoming-away-attempt-many.trycloudflare.com 
Secret
ab0e51a9ccceb4a62dff60f8f3b18e1a585fd825147f0df2dc79f18d07374e2c

** There is separate notepad file about how to test the Github webhook feature.




