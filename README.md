# go_on_or_give_up

## TradeFlow AI

AI-powered institutional trade finance on XRPL — cross-border settlement using
RLUSD, TokenEscrow (XLS-85), and AI-driven document validation, orchestrated by
a policy-controlled Treasury Agent.

Design docs:

- [docs/flowchart.md](docs/flowchart.md) — business & process flowcharts
- [docs/architecture.md](docs/architecture.md) — software architecture design

Challenge brief: [proj.md](proj.md)# TradeFlow AI

AI-assisted institutional trade finance platform built on XRPL.

## Overview

TradeFlow AI reduces cross-border settlement risk by combining:

- AI-powered invoice extraction
- Treasury policy validation
- XRPL settlement
- Escrow-based payment release

### Problem

Traditional cross-border supplier payments suffer from:

- Lack of trust between buyers and suppliers
- Slow and manual trade-finance processes
- Settlement risk
- No delivery guarantee

### Solution

TradeFlow AI introduces a secure payment workflow:

```text
Supplier Uploads Invoice
            ↓
AI Extracts Trade Data
            ↓
Treasury Agent Validation
            ↓
XRPL Escrow Creation
            ↓
Funds Reserved
            ↓
Delivery Confirmation
            ↓
Escrow Release
            ↓
Supplier Paid
````

***

## Current Progress

### Completed

✅ XRPL Testnet Connection

✅ Wallet Generation

✅ Test Wallet Funding

✅ XRP Transfer Between Wallets

✅ Transaction Hash Retrieval

### Next Milestones

⬜ EscrowCreate

⬜ EscrowFinish

⬜ Treasury Agent Rules

⬜ Invoice Extraction

⬜ Trade Dashboard

⬜ RLUSD Settlement

***

## Features

### Blockchain

* XRPL Testnet integration
* Wallet generation
* XRP payments
* Transaction history
* Escrow-based settlement (in progress)

### Trade Finance

* Invoice upload
* AI invoice extraction
* Trade creation
* Treasury approval workflow
* Delivery confirmation
* Secure supplier settlement

### Treasury Agent

Example policy:

```text
IF
Supplier Approved
AND
Amount < 50,000 USD

THEN
Automatically Create Escrow

ELSE
Manual Approval Required
```

***

## Setup

```bash
npm install
```

***

## Environment Variables

Create `.env`:

```env
NEXT_PUBLIC_CLIENT=wss://s.altnet.rippletest.net:51233
NEXT_PUBLIC_EXPLORER_NETWORK=testnet
```

***

## API Endpoints

### Existing

```http
GET  /api/connect
POST /api/generate-wallet
POST /api/create-payment
POST /api/transaction-history
```

### Planned

```http
POST /api/create-trade
POST /api/treasury-agent
POST /api/create-escrow
POST /api/release-escrow
```

***

## Demo Flow

### 1. Create Buyer Wallet

```text
Generate Wallet
```

### 2. Create Supplier Wallet

```text
Generate Wallet
```

### 3. Fund Wallets

Use XRPL Testnet Faucet.

### 4. Transfer Funds

```text
Buyer Wallet
      ↓
XRP Payment
      ↓
Supplier Wallet
```

### 5. Capture Transaction Hash

```text
Transaction Successful

Hash:
ABC123...
```

### 6. Treasury Approval

```text
Policy Passed
```

### 7. Create Escrow

```text
Funds Reserved
```

### 8. Confirm Delivery

```text
Delivery Received
```

### 9. Release Escrow

```text
Supplier Paid
```

***

## Architecture

```text
Frontend (Next.js)
          ↓
API Routes
          ↓
AI Processing
          ↓
Treasury Agent
          ↓
XRPL Integration
          ↓
Escrow Settlement
```

***

## Usage

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

***


