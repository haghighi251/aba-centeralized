# start-infra.ps1
# Starts only the infrastructure dependencies (Redis, Zookeeper, Kafka, PostgreSQL, MongoDB)
# as standalone Docker containers so each service (aba-bl, worker, aba-web) can be
# run separately on the host with `pnpm start:dev` / `pnpm dev`.
#
# Usage:  .\start-infra.ps1          # start all
#         .\start-infra.ps1 stop     # stop and remove all

param([string]$Action = "start")

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$msg) Write-Host "    $msg" -ForegroundColor Green }
function Write-Skip { param([string]$msg) Write-Host "    $msg" -ForegroundColor Yellow }

# ── Container definitions ─────────────────────────────────────────────────────
$containers = @(
    @{
        Name  = "aba-redis"
        Check = "docker ps -q -f name=aba-redis"
        Run   = "docker run -d --name aba-redis -p 6379:6379 redis:7-alpine"
        Desc  = "Redis (rate limiting / caching) on port 6379"
    },
    @{
        Name  = "aba-postgres"
        Check = "docker ps -q -f name=aba-postgres"
        Run   = 'docker run -d --name aba-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aba -v aba_postgres_data:/var/lib/postgresql/data postgres:15-alpine'
        Desc  = "PostgreSQL on port 5432  (db=aba, user=postgres, pass=postgres)"
    },
    @{
        Name  = "aba-mongo"
        Check = "docker ps -q -f name=aba-mongo"
        Run   = "docker run -d --name aba-mongo -p 27017:27017 -v aba_mongo_data:/data/db mongo:6"
        Desc  = "MongoDB on port 27017"
    },
    @{
        Name  = "aba-zookeeper"
        Check = "docker ps -q -f name=aba-zookeeper"
        Run   = "docker run -d --name aba-zookeeper -p 2181:2181 -e ZOOKEEPER_CLIENT_PORT=2181 -e ZOOKEEPER_SYNC_LIMIT=2 confluentinc/cp-zookeeper:7.5.0"
        Desc  = "Zookeeper on port 2181 (Kafka coordinator)"
    },
    @{
        Name  = "aba-kafka"
        Check = "docker ps -q -f name=aba-kafka"
        Run   = @"
docker run -d --name aba-kafka -p 9092:9092 `
  -e KAFKA_BROKER_ID=1 `
  -e KAFKA_ZOOKEEPER_CONNECT=host.docker.internal:2181 `
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 `
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT `
  -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT `
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 `
  -e KAFKA_AUTO_CREATE_TOPICS_ENABLE=true `
  confluentinc/cp-kafka:7.5.0
"@
        Desc  = "Kafka broker on port 9092 (auto-creates topics)"
    }
)

# ── Stop ──────────────────────────────────────────────────────────────────────
if ($Action -eq "stop") {
    Write-Step "Stopping infrastructure containers..."
    foreach ($c in $containers) {
        $running = Invoke-Expression $c.Check
        if ($running) {
            docker stop $c.Name | Out-Null
            docker rm   $c.Name | Out-Null
            Write-Ok "Stopped $($c.Name)"
        } else {
            Write-Skip "Not running: $($c.Name)"
        }
    }
    Write-Host "`nAll infrastructure containers stopped.`n" -ForegroundColor Green
    exit 0
}

# ── Start ─────────────────────────────────────────────────────────────────────
Write-Step "Starting infrastructure containers..."

foreach ($c in $containers) {
    $running = Invoke-Expression $c.Check

    if ($running) {
        Write-Skip "Already running: $($c.Desc)"
    } else {
        # Remove a stopped container with the same name if it exists
        $exists = docker ps -aq -f "name=$($c.Name)"
        if ($exists) { docker rm $c.Name | Out-Null }

        Write-Step "Starting $($c.Desc)"
        Invoke-Expression $c.Run | Out-Null
        Write-Ok "Started $($c.Name)"
    }
}

# ── Wait for Kafka to be ready ────────────────────────────────────────────────
Write-Step "Waiting for Kafka to be ready..."
$maxRetries = 15
$retries = 0
do {
    Start-Sleep -Seconds 3
    $retries++
    $ready = docker exec aba-kafka kafka-broker-api-versions --bootstrap-server=localhost:9092 2>$null
} while (-not $ready -and $retries -lt $maxRetries)

if ($retries -ge $maxRetries) {
    Write-Host "    Kafka not ready yet — give it a few more seconds." -ForegroundColor Yellow
} else {
    Write-Ok "Kafka is ready."
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host @"

Infrastructure is up. You can now run each service locally:

  cd aba-bl   && pnpm start:dev    # NestJS BFF on :8000
  cd worker   && pnpm dev          # Worker service on :8001
  cd aba-web  && pnpm dev          # Next.js frontend on :3000

To stop all infrastructure:
  .\start-infra.ps1 stop

"@ -ForegroundColor Green
