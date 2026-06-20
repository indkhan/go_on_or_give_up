# TradeFlow AI — Process Flowcharts

**AI-powered institutional trade finance on XRPL**

Cross-border trade settlement using **RLUSD**, **TokenEscrow (XLS-85)**, and
**AI-driven document validation**, orchestrated by a policy-controlled
**Treasury Agent**.

> These diagrams render automatically on GitHub. For local preview use any
> Mermaid-compatible viewer (VS Code "Markdown Preview Mermaid Support", etc.).

---

## 1. The pain point — trade finance today

A Swiss buyer and a Vietnamese supplier face a deadlock: the buyer wants the
goods shipped first, the supplier wants to be paid first. Banks bridge that gap
with Letters of Credit, documentary collections, and escrow — but those are
expensive, slow, and paperwork-heavy.

```mermaid
flowchart LR
    subgraph TODAY["Today: bank-intermediated, 5-90 days"]
        B["Swiss Buyer<br/>(Importer)"] -->|"'Ship first'"| DEADLOCK{{"Trust<br/>deadlock"}}
        S["Vietnam Supplier<br/>(Exporter)"] -->|"'Pay first'"| DEADLOCK
        DEADLOCK --> BANK["Correspondent Banks"]
        BANK --> LC["Letter of Credit"]
        BANK --> DC["Documentary Collection"]
        BANK --> ESC["Bank Escrow"]
    end

    LC --> PAIN["💸 Expensive fees<br/>🐢 Slow (weeks)<br/>📄 Manual paperwork<br/>🔍 Opaque status"]
    DC --> PAIN
    ESC --> PAIN

    classDef pain fill:#5b1d1d,stroke:#ff6b6b,color:#fff;
    class PAIN,DEADLOCK pain;
```

---

## 2. TradeFlow AI — end-to-end settlement flow

The same trade, settled programmatically. Documents are validated by AI, funds
are locked in an on-chain **TokenEscrow**, and release is triggered
automatically once shipment is confirmed — no correspondent banks, settlement
in seconds.

```mermaid
flowchart TD
    A["Supplier uploads documents<br/>Invoice · Purchase Order · Shipping Doc"] --> B["AI Document Intelligence<br/>extract + validate"]
    B --> C{"Documents<br/>consistent &<br/>complete?"}
    C -->|No| C1["Reject / request re-upload"]
    C1 --> A
    C -->|Yes| D["Structured trade record<br/>amount · buyer · supplier · due date"]

    D --> E["Buyer reviews & approves"]
    E --> F{"Buyer<br/>approves?"}
    F -->|No| F1["Trade cancelled"]
    F -->|Yes| G["Treasury Agent runs policy checks"]

    G --> H{"Policy<br/>passed?"}
    H -->|No| H1["Block + audit log<br/>escalate to human"]
    H -->|Yes| I["50,000 RLUSD locked in<br/>TokenEscrow (XLS-85)"]

    I --> J["Goods shipped"]
    J --> K["Shipment confirmation uploaded"]
    K --> L["AI validates proof of shipment"]
    L --> M{"Release<br/>condition met?"}
    M -->|No| M1["Hold escrow<br/>(dispute / timeout path)"]
    M -->|Yes| N["EscrowFinish on XRPL"]
    N --> O["✅ Supplier receives RLUSD<br/>settled in seconds"]
    O --> P["Immutable audit trail<br/>+ auto-reconciliation"]

    classDef ok fill:#0f3d2e,stroke:#3ddc84,color:#fff;
    classDef warn fill:#4a3c10,stroke:#f5c542,color:#fff;
    classDef bad fill:#5b1d1d,stroke:#ff6b6b,color:#fff;
    class I,N,O,P ok;
    class H1,M1 warn;
    class C1,F1 bad;
```

---

## 3. Treasury Agent — policy decision flow

The "killer upgrade": an autonomous, policy-controlled agent sits between
**payment intent** and **settled transaction**. This is what lets TradeFlow AI
hit the Agent Financial Infrastructure pillar — at least one on-chain
transaction executed autonomously, inside institutional guardrails.

```mermaid
flowchart TD
    START["Approved invoice arrives"] --> V1["AI verifies invoice amount<br/>matches PO"]
    V1 --> V2{"Amount within<br/>spending limit?"}
    V2 -->|No| BLK["⛔ Block transaction"]
    V2 -->|Yes| V3{"Supplier on<br/>whitelist?"}
    V3 -->|No| BLK
    V3 -->|Yes| V4{"Sanctions /<br/>compliance screen<br/>clear?"}
    V4 -->|No| BLK
    V4 -->|Yes| V5{"Jurisdiction<br/>allowed?"}
    V5 -->|No| BLK
    V5 -->|Yes| V6{"Above approval<br/>threshold?"}
    V6 -->|Yes| HUM["Human co-sign required"]
    V6 -->|No| EXEC["Agent executes on-chain<br/>fund TokenEscrow with RLUSD"]
    HUM --> HD{"Approved by<br/>treasurer?"}
    HD -->|No| BLK
    HD -->|Yes| EXEC

    EXEC --> AUDIT["Write to audit trail<br/>(who · what · when · policy version)"]
    BLK --> AUDIT

    classDef exec fill:#0f3d2e,stroke:#3ddc84,color:#fff;
    classDef block fill:#5b1d1d,stroke:#ff6b6b,color:#fff;
    classDef human fill:#1d3a5b,stroke:#5b9bff,color:#fff;
    class EXEC exec;
    class BLK block;
    class HUM,HD human;
```

---

## 4. Escrow lifecycle — sequence view

End-to-end interaction across the supplier, buyer, AI layer, Treasury Agent, and
the XRPL ledger. The two on-chain transactions that matter for judging are
`EscrowCreate` (funding) and `EscrowFinish` (release).

```mermaid
sequenceDiagram
    autonumber
    actor Sup as Supplier
    actor Buy as Buyer / Treasurer
    participant AI as AI Doc Intelligence
    participant AG as Treasury Agent
    participant XRPL as XRPL Ledger

    Sup->>AI: Upload Invoice + PO + Shipping doc
    AI->>AI: OCR + extract + cross-check
    AI-->>Buy: Structured trade record for review
    Buy->>AG: Approve trade
    AG->>AG: Run policy checks (limits, whitelist, sanctions)
    AG->>XRPL: EscrowCreate (lock 50,000 RLUSD)
    XRPL-->>AG: Escrow object created (sequence/hash)
    Note over Sup,XRPL: Funds locked — neither party can touch them

    Sup->>AI: Upload shipment confirmation
    AI->>AI: Validate proof of shipment
    AI-->>AG: Release condition met
    AG->>XRPL: EscrowFinish (release to supplier)
    XRPL-->>Sup: 50,000 RLUSD received
    XRPL-->>Buy: Settlement confirmation + audit record
```

---

## 5. Where each step maps to the challenge

| Flow step | XRPL feature / pillar |
| --- | --- |
| Document upload + extraction | AI Document Intelligence (Creativity) |
| Policy checks before payment | Agent Financial Infrastructure |
| Lock funds | TokenEscrow (XLS-85) + RLUSD |
| Cross-border settlement | Payments & FX |
| Release on shipment proof | Programmable invoice logic |
| Audit trail | Institutional guardrails / compliance |
| (Optional) supplier financing | Lending Protocol (XLS-66) |

See [architecture.md](architecture.md) for the system design behind these flows.
