# TradeFlow AI — Software Architecture

**Cross-border trade settlement using RLUSD, TokenEscrow, and AI-driven document
validation, orchestrated by a policy-controlled Treasury Agent on XRPL.**

This document describes the system architecture: layers, components, data flow,
the escrow state machine, on-chain transactions, and how each piece maps to the
SwissHacks "Future of Finance on XRPL" challenge pillars.

Companion doc: [flowchart.md](flowchart.md) (business & process flows).

---

## 1. Architectural principles

1. **On-chain is the source of truth for value.** Escrow state and settlement
   live on XRPL; the backend never custodies funds — it only orchestrates.
2. **The agent has intent, the ledger has authority.** The Treasury Agent
   decides *whether* to transact; guardrails are enforced before any signed
   transaction reaches the ledger.
3. **AI is advisory, not custodial.** AI extracts and validates documents and
   proposes actions; it never holds keys or moves money directly.
4. **Every decision is auditable.** Each policy check, approval, and on-chain
   action is written to an immutable audit log keyed to the ledger transaction.
5. **Testnet-first, Mainnet-credible.** Build on XRPL Testnet/Devnet with a
   clean path to Mainnet (RLUSD + TokenEscrow are Mainnet-available).

---

## 2. System architecture (layered)

```mermaid
flowchart TB
    subgraph CLIENT["Client Layer"]
        UI["Web App (React/Next.js)<br/>Supplier · Buyer · Treasurer dashboards"]
        WALLET["Wallet connector<br/>(xrpl-connect: Xaman/Crossmark/GemWallet)"]
    end

    subgraph API["Application Layer (Backend API)"]
        GW["API Gateway / BFF"]
        TRADE["Trade Service<br/>invoices · POs · trade lifecycle"]
        DOCSVC["Document Service<br/>upload · storage refs"]
        AUTH["Auth & Identity<br/>org accounts · roles"]
        AUDIT["Audit & Reconciliation Service"]
    end

    subgraph AILAYER["AI Layer"]
        OCR["Document Intelligence<br/>OCR + LLM extraction"]
        VALID["Validation Engine<br/>cross-doc consistency, fraud signals"]
    end

    subgraph AGENT["Agent Layer"]
        TREAS["Treasury Agent<br/>orchestration + intent"]
        POLICY["Policy Engine<br/>limits · whitelist · sanctions · jurisdiction"]
        SIGNER["Signing Service<br/>scoped keys / HSM"]
    end

    subgraph XRPLLAYER["XRPL Integration Layer"]
        SDK["xrpl.js / xrpl-py client"]
        TXBUILD["Transaction Builder<br/>EscrowCreate · EscrowFinish · Payment"]
        LISTEN["Ledger Listener<br/>subscribe to tx / escrow events"]
    end

    subgraph LEDGER["XRPL (Testnet → Mainnet)"]
        RLUSD["RLUSD<br/>settlement asset"]
        ESCROW["TokenEscrow (XLS-85)"]
        CRED["Credentials / Permissioned Domains<br/>(KYA, optional)"]
        LEND["Lending Protocol (XLS-66)<br/>supplier financing (optional)"]
    end

    DB[("PostgreSQL<br/>trades · policies · audit")]
    BLOB[("Object Storage<br/>document files")]

    UI --> GW
    WALLET --> GW
    GW --> TRADE
    GW --> DOCSVC
    GW --> AUTH
    TRADE --> AUDIT
    DOCSVC --> BLOB
    DOCSVC --> OCR
    OCR --> VALID
    VALID --> TRADE
    TRADE --> TREAS
    TREAS --> POLICY
    POLICY --> SIGNER
    SIGNER --> TXBUILD
    TXBUILD --> SDK
    SDK --> RLUSD
    SDK --> ESCROW
    LISTEN --> SDK
    LISTEN --> AUDIT
    ESCROW -.events.-> LISTEN
    TRADE --> DB
    AUDIT --> DB
    POLICY --> DB
    TREAS -.optional.-> LEND
    AUTH -.optional.-> CRED

    classDef ledger fill:#0f3d2e,stroke:#3ddc84,color:#fff;
    classDef agent fill:#1d3a5b,stroke:#5b9bff,color:#fff;
    class RLUSD,ESCROW,CRED,LEND ledger;
    class TREAS,POLICY,SIGNER agent;
```

---

## 3. Component responsibilities

| Component | Responsibility | Notes |
| --- | --- | --- |
| **Web App** | Role-based dashboards for supplier, buyer, treasurer | Upload docs, approve trades, view escrow status |
| **Wallet connector** | Connect institutional XRPL wallets | `xrpl-connect` (Xaman, Crossmark, GemWallet, WalletConnect) |
| **API Gateway / BFF** | Single entry point, auth, request routing | Thin orchestration layer |
| **Trade Service** | Owns the trade lifecycle state machine | Coordinates AI, agent, and ledger steps |
| **Document Service** | Handle uploads, store file refs, hash docs | Document hashes can be anchored on-chain |
| **Document Intelligence** | OCR + LLM extraction of structured fields | Invoice amount, buyer, supplier, due date |
| **Validation Engine** | Cross-document consistency & fraud signals | Invoice vs PO vs shipping doc reconciliation |
| **Treasury Agent** | Autonomous orchestration of settlement intent | The on-chain action executor |
| **Policy Engine** | Enforce guardrails before signing | Limits, whitelist, sanctions, jurisdiction, thresholds |
| **Signing Service** | Hold scoped keys, sign transactions | HSM/KMS in production; never exposed to AI layer |
| **Transaction Builder** | Construct XRPL transactions | `EscrowCreate`, `EscrowFinish`, `Payment` |
| **Ledger Listener** | Subscribe to ledger/escrow events | Drives state transitions + audit records |
| **Audit Service** | Immutable log + reconciliation | Each entry references the on-chain tx hash |

---

## 4. Trade lifecycle — state machine

```mermaid
stateDiagram-v2
    [*] --> DocsUploaded
    DocsUploaded --> Validated: AI extraction + cross-check passes
    DocsUploaded --> Rejected: inconsistent / incomplete
    Validated --> Approved: buyer approves
    Validated --> Cancelled: buyer rejects
    Approved --> PolicyPassed: Treasury Agent checks pass
    Approved --> Blocked: policy violation
    PolicyPassed --> Escrowed: EscrowCreate (RLUSD locked)
    Escrowed --> ShipmentConfirmed: proof of shipment validated
    Escrowed --> Refunded: timeout / dispute (EscrowCancel)
    ShipmentConfirmed --> Settled: EscrowFinish (RLUSD released)
    Settled --> [*]
    Rejected --> [*]
    Cancelled --> [*]
    Blocked --> [*]
    Refunded --> [*]
```

---

## 5. On-chain transaction sequence

The two settlement-critical, autonomously-executed transactions are
`EscrowCreate` and `EscrowFinish`. `EscrowCancel` covers the timeout/dispute
path.

```mermaid
sequenceDiagram
    autonumber
    participant TRADE as Trade Service
    participant AG as Treasury Agent
    participant POL as Policy Engine
    participant SIGN as Signing Service
    participant XRPL as XRPL Ledger
    participant LIS as Ledger Listener
    participant AUD as Audit Service

    TRADE->>AG: settlement intent (trade #, amount, supplier)
    AG->>POL: evaluate(policy, trade)
    POL-->>AG: allow + constraints
    AG->>SIGN: build & sign EscrowCreate (RLUSD, condition)
    SIGN->>XRPL: submit EscrowCreate
    XRPL-->>LIS: tx validated (escrow object)
    LIS->>AUD: record(EscrowCreate, hash, trade #)

    Note over TRADE,XRPL: ... shipment confirmed + AI-validated ...

    TRADE->>AG: release intent (fulfillment)
    AG->>POL: re-check (still allowed?)
    POL-->>AG: allow
    AG->>SIGN: build & sign EscrowFinish (fulfillment)
    SIGN->>XRPL: submit EscrowFinish
    XRPL-->>LIS: tx validated (funds to supplier)
    LIS->>AUD: record(EscrowFinish, hash, trade #)
```

---

## 6. Data model (core entities)

```mermaid
erDiagram
    ORGANIZATION ||--o{ TRADE : participates
    TRADE ||--|{ DOCUMENT : has
    TRADE ||--o| ESCROW : "locked by"
    TRADE ||--|{ AUDIT_EVENT : generates
    POLICY ||--o{ POLICY_CHECK : defines
    TRADE ||--o{ POLICY_CHECK : evaluated_by

    ORGANIZATION {
        uuid id
        string name
        string role
        string xrpl_address
        bool whitelisted
    }
    TRADE {
        uuid id
        decimal amount
        string currency
        uuid buyer_id
        uuid supplier_id
        date due_date
        string status
    }
    DOCUMENT {
        uuid id
        string type
        string storage_ref
        string sha256
        json extracted_fields
    }
    ESCROW {
        uuid id
        string xrpl_tx_create
        string xrpl_tx_finish
        string condition
        string fulfillment
        string state
    }
    POLICY {
        uuid id
        decimal spend_limit
        decimal approval_threshold
        json allowed_jurisdictions
    }
    POLICY_CHECK {
        uuid id
        string check_type
        string result
        timestamp evaluated_at
    }
    AUDIT_EVENT {
        uuid id
        string event_type
        string xrpl_tx_hash
        json payload
        timestamp created_at
    }
```

---

## 7. Suggested tech stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Frontend | React / Next.js + Tailwind | Fast institutional dashboards |
| Wallet | `xrpl-connect` | Multi-wallet XRPL support |
| Backend | Node.js (NestJS) or Python (FastAPI) | Pairs with `xrpl.js` / `xrpl-py` |
| AI | LLM document extraction + rules engine | Structured field extraction + validation |
| Agent | Policy engine + scoped signer | Optionally x402 for agent payment flows |
| XRPL SDK | `xrpl.js` (TS) or `xrpl-py` | TokenEscrow + RLUSD transactions |
| Persistence | PostgreSQL + object storage | Trades, policies, audit, document files |
| Settlement asset | RLUSD | Stable, programmable, Mainnet-ready |

---

## 8. XRPL feature usage (for judging)

| Feature / Amendment | Used for | Status |
| --- | --- | --- |
| **RLUSD** | Settlement asset locked & released | Mainnet / Testnet |
| **TokenEscrow (XLS-85)** | Conditional fund lock & release | Mainnet / Testnet / Devnet |
| **XRPL transactions** | `EscrowCreate`, `EscrowFinish`, `EscrowCancel`, `Payment` | Core |
| **Agent infrastructure** | Autonomous policy-gated on-chain execution | x402 optional |
| **Credentials / Permissioned Domains** | KYA — verified counterparties (optional) | Devnet |
| **Lending Protocol (XLS-66)** | Supplier early-financing of receivables (optional) | Devnet |

**Mapping to challenge pillars:**

- **Payments & FX** ✅ — cross-border settlement in RLUSD, programmable invoice logic, auto-reconciliation.
- **Credit & Lending** ✅ (optional) — tokenized receivables financing via XLS-66.
- **Agent Financial Infrastructure** ✅ — Treasury Agent executes on-chain transactions inside institutional guardrails (spending limits, policy enforcement, compliance checks, audit trails).

---

## 9. Path to Mainnet

1. **Now (hackathon):** XRPL Testnet/Devnet, real `EscrowCreate`/`EscrowFinish`
   with RLUSD, AI extraction on sample trade docs, policy engine + audit log.
2. **Hardening:** move signing into HSM/KMS, formal sanctions/KYC providers,
   Credentials-based KYA for counterparties.
3. **Mainnet:** RLUSD + TokenEscrow are Mainnet-available; add lending (XLS-66)
   for supplier financing once it graduates from Devnet.
