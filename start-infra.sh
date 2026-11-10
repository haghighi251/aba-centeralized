#!/bin/bash
# start-infra.sh — starts Redis, PostgreSQL, MongoDB, Zookeeper, Kafka as
# standalone Docker containers so services run locally without docker-compose.
#
# Usage:  ./start-infra.sh          # start
#         ./start-infra.sh stop     # stop and remove

set -e
ACTION=${1:-start}

step()  { echo -e "\n\033[36m==> $1\033[0m"; }
ok()    { echo -e "    \033[32m$1\033[0m"; }
skip()  { echo -e "    \033[33m$1\033[0m"; }

start_if_absent() {
    local name=$1 run_cmd=$2 desc=$3
    if docker ps -q -f name="$name" | grep -q .; then
        skip "Already running: $desc"
    else
        # Remove stopped container with same name
        docker ps -aq -f name="$name" | grep -q . && docker rm "$name" 2>/dev/null || true
        step "Starting $desc"
        eval "$run_cmd"
        ok "Started $name"
    fi
}

if [ "$ACTION" = "stop" ]; then
    step "Stopping infrastructure containers..."
    for name in aba-redis aba-postgres aba-mongo aba-zookeeper aba-kafka; do
        if docker ps -q -f name="$name" | grep -q .; then
            docker stop "$name" && docker rm "$name"
            ok "Stopped $name"
        else
            skip "Not running: $name"
        fi
    done
    echo -e "\n\033[32mAll infrastructure containers stopped.\033[0m\n"
    exit 0
fi

step "Starting infrastructure..."

start_if_absent "aba-redis" \
    "docker run -d --name aba-redis -p 6379:6379 redis:7-alpine" \
    "Redis (port 6379)"

start_if_absent "aba-postgres" \
    "docker run -d --name aba-postgres -p 5432:5432 \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=aba \
     -v aba_postgres_data:/var/lib/postgresql/data \
     postgres:15-alpine" \
    "PostgreSQL (port 5432, db=aba)"

start_if_absent "aba-mongo" \
    "docker run -d --name aba-mongo -p 27017:27017 \
     -v aba_mongo_data:/data/db mongo:6" \
    "MongoDB (port 27017)"

start_if_absent "aba-zookeeper" \
    "docker run -d --name aba-zookeeper -p 2181:2181 \
     -e ZOOKEEPER_CLIENT_PORT=2181 \
     -e ZOOKEEPER_SYNC_LIMIT=2 \
     confluentinc/cp-zookeeper:7.5.0" \
    "Zookeeper (port 2181)"

# On Linux, host.docker.internal may not resolve — use the bridge IP instead
KAFKA_ZOOKEEPER_HOST="host.docker.internal"
if [ "$(uname)" = "Linux" ]; then
    KAFKA_ZOOKEEPER_HOST=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.Gateway}}{{end}}' aba-zookeeper 2>/dev/null || echo "172.17.0.1")
fi

start_if_absent "aba-kafka" \
    "docker run -d --name aba-kafka -p 9092:9092 \
     -e KAFKA_BROKER_ID=1 \
     -e KAFKA_ZOOKEEPER_CONNECT=${KAFKA_ZOOKEEPER_HOST}:2181 \
     -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
     -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT \
     -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT \
     -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
     -e KAFKA_AUTO_CREATE_TOPICS_ENABLE=true \
     confluentinc/cp-kafka:7.5.0" \
    "Kafka broker (port 9092)"

# Wait for Kafka
step "Waiting for Kafka to be ready..."
retries=0
until docker exec aba-kafka kafka-broker-api-versions --bootstrap-server=localhost:9092 &>/dev/null || [ $retries -ge 15 ]; do
    sleep 3
    retries=$((retries + 1))
done
[ $retries -ge 15 ] && skip "Kafka not ready yet — give it a few more seconds." || ok "Kafka is ready."

echo -e "
\033[32mInfrastructure is up. Run each service locally:

  cd aba-bl   && pnpm start:dev    # NestJS BFF on :8000
  cd worker   && pnpm dev          # Worker service on :8001
  cd aba-web  && pnpm dev          # Next.js frontend on :3000

To stop:  ./start-infra.sh stop
\033[0m"
