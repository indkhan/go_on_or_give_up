# Background

* Hackathon: SwissHacks 2026
* Challenge: Ripple - Future of Finance on XRPL (Payments, Trade Finance, Agent Financial Infrastructure)
* Project: TradeFlow AI
* Goal: Demonstrate an institutional trade-finance workflow on XRPL.
* Focus:
  * Trade finance
  * XRPL Escrow
  * Agent-driven policy enforcement
  * Working end-to-end demo
* Explicitly excluded from MVP:
  * Lending
  * XLS-66
  * Authentication
  * Authorization
  * RBAC
  * Audit infrastructure beyond XRPL transaction hashes
  * Microservices
  * Enterprise security
  * Complex AI autonomy

***

# Project Details

## Core project/feature

TradeFlow AI

AI-assisted institutional trade finance platform using XRPL escrow.

***

## Business Workflow

```text
Supplier Uploads Invoice
        ↓
Trade Created
        ↓
Treasury Agent Validation
        ↓
Escrow Created
        ↓
Funds Reserved
        ↓
Delivery Confirmed
        ↓
Escrow Released
        ↓
Supplier Paid
```

***

## Architecture

```text
Frontend (Next.js)
        ↓
Next.js API Routes
        ↓
XRPL Testnet
        ↓
Escrow Settlement
```

***

# Folder Structure

```text
app
├── REST Client.http
├── api
│   ├── account-info
│   │   └── route.js
│   ├── connect
│   │   └── route.js
│   ├── create-escrow
│   │   └── route.js
│   ├── create-payment
│   │   └── route.js
│   ├── create-trade
│   │   └── route.js
│   ├── generate-wallet
│   │   └── route.js
│   ├── mint-ticket
│   │   └── route.js
│   ├── release-escrow
│   │   └── route.js
│   ├── transaction-history
│   │   └── route.js
│   └── treasury-agent
│       └── route.js
├── cart
│   └── page.jsx
├── components
│   ├── TransactionHistory.js
│   ├── event-ticket.jsx
│   └── wallet.jsx
├── context
│   └── WalletContext.js
├── globals.css
├── hooks
│   └── useFetch.js
├── layout.js
├── page.js
└── utils
    └── get-wallet-details.js
```

***

# Important Files/Modules

## Backend APIs

### app/api/connect/route.js

Purpose:

```text
XRPL connectivity health check
```

Endpoint:

```http
GET /api/connect
```

***

### app/api/generate-wallet/route.js

Purpose:

```text
Generate XRPL wallets
```

Endpoint:

```http
POST /api/generate-wallet
```

***

### app/api/account-info/route.js

Purpose:

```text
Retrieve wallet balance
```

Endpoint:

```http
POST /api/account-info
```

Returns:

```text
Address
XRP Balance
```

***

### app/api/create-payment/route.js

Purpose:

```text
Direct XRP transfer
```

Endpoint:

```http
POST /api/create-payment
```

Status:

```text
Working
```

***

### app/api/create-trade/route.js

Purpose:

```text
Create trade record
```

Endpoint:

```http
POST /api/create-trade
```

Status:

```text
Working
```

***

### app/api/treasury-agent/route.js

Purpose:

```text
Policy evaluation
```

Endpoint:

```http
POST /api/treasury-agent
```

Current Policy:

```js
trade.amount < 50000 &&
trade.supplierApproved
```

Returns:

```json
{
  "tradeId": "...",
  "approved": true,
  "decision": "...",
  "policyChecks": {
    "supplierApproved": true,
    "thresholdCheck": true
  }
}
```

Status:

```text
Working
```

***

### app/api/create-escrow/route.js

Purpose:

```text
Create XRPL escrow
```

Endpoint:

```http
POST /api/create-escrow
```

Transaction:

```text
EscrowCreate
```

Status:

```text
Working
```

Verified:

```text
Escrow successfully created on XRPL Testnet.
```

***

### app/api/release-escrow/route.js

Purpose:

```text
Release XRPL escrow
```

Endpoint:

```http
POST /api/release-escrow
```

Transaction:

```text
EscrowFinish
```

Status:

```text
Working
```

Verified:

```text
Escrow successfully released on XRPL Testnet.
```

***

### app/api/transaction-history/route.js

Purpose:

```text
Retrieve transaction history
```

Endpoint:

```http
POST /api/transaction-history
```

Technical Debt:

```text
Uses process.env.CLIENT while other APIs use process.env.NEXT_PUBLIC_CLIENT.
```

***

### app/api/mint-ticket/route.js

Purpose:

```text
Legacy NFT minting endpoint from previous project.
```

Status:

```text
Not part of TradeFlow MVP.
```

***

# External APIs / Integrations

## XRPL Testnet

Connection:

```env
NEXT_PUBLIC_CLIENT=wss://s.altnet.rippletest.net:51233
```

Used by:

```text
connect
account-info
create-payment
create-escrow
release-escrow
mint-ticket
transaction-history
```

***

# Key Functions

## XRPL

```js
xrpl.Wallet.generate()
```

```js
xrpl.Wallet.fromSeed()
```

```js
xrpl.xrpToDrops()
```

```js
xrpl.dropsToXrp()
```

```js
xrpl.isoTimeToRippleTime()
```

```js
client.connect()
```

```js
client.submitAndWait()
```

```js
client.request()
```

***

# Key Variables

## Treasury Agent

```js
approved
```

```js
thresholdCheck
```

```js
supplierCheck
```

```js
trade.amount
```

```js
trade.supplierApproved
```

***

## Escrow

```js
buyerSeed
```

```js
supplierSeed
```

```js
supplierAddress
```

```js
offerSequence
```

```js
owner
```

```js
finishAfter
```

***

# Key Decisions

## Architecture

```text
Reuse existing Next.js project.
```

Reason:

```text
Already contained XRPL integration and wallet functionality.
```

***

## Agent Strategy

```text
Policy-governed Treasury Agent.
```

Current policy:

```js
trade.amount < 50000 &&
trade.supplierApproved
```

***

## Settlement Strategy

```text
XRPL Escrow
```

Flow:

```text
EscrowCreate
↓
Funds Reserved
↓
EscrowFinish
```

***

## Trade Finance Positioning

Target users:

```text
Treasury Departments
Import/Export Companies
Banks
Fintechs
```

***

## Frontend Positioning

UI should use business language:

Preferred:

```text
Reserve Funds
Confirm Delivery
Supplier Paid
```

Avoid exposing blockchain terminology unnecessarily.

***

# What Has Been Successfully Implemented

```text
✅ XRPL Connection

✅ Wallet Generation

✅ Wallet Funding (via XRPL Faucet)

✅ Direct XRP Transfer

✅ Transaction Hash Retrieval

✅ Trade Creation

✅ Treasury Agent

✅ Policy Enforcement

✅ EscrowCreate

✅ EscrowFinish

✅ XRP Balance Lookup
```

***

# Agent Financial Infrastructure Assessment

Implemented:

```text
✅ Agent-triggered on-chain transaction

✅ Policy enforcement

✅ Spending threshold

✅ Supplier approval check

✅ XRPL audit trail via transaction hashes

✅ Escrow settlement workflow
```

Not implemented:

```text
❌ DID

❌ Credentials

❌ Permissioned Domains

❌ KYA

❌ Sanctions Screening

❌ Jurisdiction Checks

❌ RLUSD Settlement
```

Assessment:

```text
Challenge requirement substantially satisfied through policy-governed Treasury Agent executing XRPL escrow transactions after policy validation.
```

***

# Concrete Technical Debt

## transaction-history/route.js

Issue:

```js
process.env.CLIENT
```

All other XRPL APIs use:

```js
process.env.NEXT_PUBLIC_CLIENT
```

Action:

```text
Standardize environment variable usage.
```

***

## mint-ticket/route.js

Issue:

```text
Legacy NFT functionality not used by TradeFlow.
```

Action:

```text
Remove or clearly separate from MVP scope.
```

***

# Outstanding Problems

## Frontend

Not implemented:

```text
Invoice Upload UI
Trade Dashboard UI
Treasury Agent UI
Funds Reserved UI
Delivery Confirmation UI
Payment Settlement UI
```

***

## AI

Not implemented:

```text
Invoice extraction
```

Current trade data is manually entered.

***

## RLUSD

Not implemented:

```text
RLUSD settlement flow
```

Current implementation uses:

```text
XRP
```

***

# Requested Next Actions

## Frontend

Build a single-page workflow:

```text
1. Invoice

2. Trade Summary

3. Treasury Agent

4. Funds Reserved

5. Delivery Confirmation

6. Payment Settlement
```

Wire sequentially:

```text
create-trade
↓
treasury-agent
↓
create-escrow
↓
release-escrow
```

***

## Frontend UX

Progress bar:

```text
Invoice
↓
Approval
↓
Funds Reserved
↓
Delivered
↓
Paid
```

***

## Delivery Trigger

Button:

```text
Confirm Delivery
```

Action:

```http
POST /api/release-escrow
```

Business meaning:

```text
Delivery confirmed
↓
Treasury Agent validates
↓
Escrow released
↓
Supplier paid
```

***

## Demo Script

```text
1. Supplier uploads invoice

2. Trade created

3. Treasury Agent evaluates policies

4. Funds reserved using XRPL escrow

5. Funds locked

6. Delivery confirmed

7. Escrow released

8. Supplier paid

9. Transaction hash displayed
```
