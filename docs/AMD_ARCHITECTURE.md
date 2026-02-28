# SmartPark AI: AMD-Aligned Architecture

## 1) AMD Architecture Mapping

- Backend APIs + Socket.IO gateway: AMD EPYC cloud compute for high-concurrency request and realtime event workloads.
- PostgreSQL analytics + transactional reservations: AMD EPYC DB infrastructure for parallel query execution and sustained throughput.
- Facility edge runtime: AMD Ryzen mini server for local MQTT processing, buffering, and secure upstream forwarding.
- AI inference service (next phase): AMD Instinct GPU with ROCm for occupancy forecasting, anomaly detection, and traffic optimization.
- Smart IoT controller tier: AMD Adaptive SoC-based edge devices for local signal pre-processing.

## 2) Text Architecture Diagram

```text
IoT Sensors / Cameras
        |
        v
AMD Adaptive SoC Device Layer
(edge pre-processing)
        |
        v
AMD Ryzen Edge Node (per facility)
(MQTT normalize, local buffering, retry)
        |
        v
Secure Uplink (TLS MQTT / HTTPS)
        |
        v
AMD EPYC Cloud Backend
(Express APIs, Socket.IO, RBAC, booking engine)
        |
        +--> PostgreSQL + Prisma (EPYC-backed)
        |
        +--> AI Inference Service (AMD Instinct + ROCm)
                  |
                  v
            predictions + optimization signals
        |
        v
Realtime React Dashboard
```

## 3) Performance Advantages (No Fake Benchmarks)

- WebSocket concurrency: EPYC core density supports parallel Node workers and socket event fanout under burst traffic.
- PostgreSQL analytics: EPYC memory bandwidth and CPU parallelism support mixed transactional and analytical loads.
- MQTT ingestion: Ryzen edge handles local stream processing while EPYC backend parallelizes validation and persistence.
- Realtime dashboard UX: lower event and query latency under concurrent users.
- Parallel booking requests: stronger multi-core processing for reservation conflict checks and transaction retries.

## 4) Hackathon Judge Pitch

### Three quick points
- SmartPark AI uses AMD edge-to-cloud topology: Ryzen at facilities, EPYC in cloud, Instinct for AI inference.
- Realtime data path is production-shaped: MQTT -> secure backend -> Socket.IO live dashboard.
- AI-ready design: ROCm inference service can plug in without redesigning the core app.

### 30-second explanation
SmartPark AI is designed around AMD's full stack. At parking facilities, Ryzen edge nodes collect and normalize sensor data. In cloud, EPYC powers our APIs, reservation engine, and realtime websocket distribution. For next-stage intelligence, Instinct GPUs with ROCm run occupancy and demand inference. So this is not only a frontend demo; it is an AMD-aligned smart-city architecture with a practical production path.

### 2-minute technical explanation
We split SmartPark AI into edge, cloud, and AI planes. Edge facilities run a Ryzen node that ingests local telemetry via MQTT, performs sanity checks, and buffers data during uplink interruptions. This keeps on-site reliability high.

In cloud, EPYC-backed services run Express APIs, Socket.IO fanout, and reservation workflows. The same backend handles realtime updates and analytical endpoints, while PostgreSQL serves transactional and aggregated workloads in parallel.

For AI extension, we introduce a separate inference microservice on AMD Instinct + ROCm. It consumes historical reservations and live occupancy streams to output short-term demand forecasts, anomaly alerts, and zone-level optimization signals. Those predictions are then exposed through API and pushed into the dashboard over existing websocket channels.

This gives SmartPark AI a realistic path from prototype to scalable smart-city operations while staying consistent with AMD's compute, edge, and AI ecosystem.

## 5) Section-5 AI Extension Plan (Instinct + ROCm)

- Add `ai-service` (Python FastAPI + ROCm-compatible inference runtime).
- Inputs: reservation history, hourly occupancy, event streams, temporal features.
- Outputs:
  - occupancy prediction (1-6 hour horizon),
  - zone congestion risk,
  - anomaly score for device/sensor drift.
- Integration:
  - backend polls/publishes predictions,
  - emits `prediction:updated` over Socket.IO,
  - dashboard overlays map and analytics panels.
- Operational path:
  - offline batch retraining,
  - online inference serving,
  - model versioning and drift monitoring.
