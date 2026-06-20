# Frontend Tasks - TradeFlow AI

## Goal

Build the frontend around the business workflow, not around XRPL APIs.

Judges should see:

```text
Supplier uploads invoice
        ↓
Trade created
        ↓
Treasury Agent approves
        ↓
Funds reserved
        ↓
Delivery confirmed
        ↓
Supplier paid
```

not:

```text
Wallets
Hashes
EscrowFinish
OfferSequence
```

---

# Overall Screen

Single-page workflow.

Top of page:

```text
TradeFlow AI
AI-Assisted Trade Finance on XRPL
```

Progress Bar:

```text
✅ Invoice
→
✅ Approval
→
✅ Funds Reserved
→
⬜ Delivered
→
⬜ Paid
```

---

# Card 1 - Invoice

## Purpose

Start the trade journey.

## Fields

```text
Supplier Name
Buyer Name
Amount
Currency
Upload Invoice (optional)
```

## Action

Button:

```text
Create Trade
```

Calls:

```http
POST /api/create-trade
```

Example Request:

```json
{
  "supplier": "ABC Supplier",
  "buyer": "Swiss Import AG",
  "amount": 25000
}
```

## Display

```text
Trade Created Successfully
```

---

# Card 2 - Trade Summary

## Purpose

Display trade details.

## Fields

```text
Trade ID
Supplier
Buyer
Amount
Status
```

Example:

```text
Trade: T-123456

Supplier:
ABC Supplier

Buyer:
Swiss Import AG

Amount:
25,000 USD

Status:
Pending Approval
```

Source:

```http
POST /api/create-trade
```

---

# Card 3 - Treasury Agent

## Purpose

Demonstrate autonomous policy validation.

## Action

Button:

```text
Run Treasury Agent
```

Calls:

```http
POST /api/treasury-agent
```

Example Request:

```json
{
  "tradeId": "T-123456",
  "amount": 25000
}
```

## Success State

```text
✅ Escrow Approved

Policy:
Amount < 50,000 USD
```

## Failure State

```text
⚠ Manual Approval Required
```

---

# Card 4 - Funds Reserved

## Purpose

Show buyer funds are reserved and payment is guaranteed.

Business meaning:

```text
Buyer reserves money.

Supplier receives payment guarantee.
```

## Action

Button:

```text
Reserve Funds
```

Backend:

```http
POST /api/create-escrow
```

## Request

```json
{
  "buyerSeed": "...",
  "supplierAddress": "...",
  "amount": "2"
}
```

## Success State

```text
✅ Funds Reserved

Amount:
2 XRP

Status:
FUNDS LOCKED

Transaction Hash:
5A2F311F...
```

## Progress Bar Update

```text
✅ Invoice
✅ Approval
✅ Funds Reserved
⬜ Delivered
⬜ Paid
```

---

# Card 5 - Delivery Confirmation

## Purpose

Trigger payment release.

This is the most important user action in the demo.

## Status

```text
Shipment Status

In Transit
```

## Button

```text
Confirm Delivery
```

Important:

Do NOT use:

```text
Release Escrow
```

Judges understand:

```text
Confirm Delivery
```

much faster.

---

# Card 6 - Payment Settlement

## Purpose

Release escrow and pay supplier.

When user clicks:

```text
Confirm Delivery
```

Frontend should call:

```http
POST /api/release-escrow
```

## Request

```json
{
  "supplierSeed": "...",
  "owner": "...",
  "offerSequence": 18378764
}
```

## Success State

```text
✅ Delivery Confirmed

✅ Payment Released

✅ Supplier Paid

Settlement Hash:
41F8AEF955...
```

Final Status:

```text
PAID
```

## Progress Bar Update

```text
✅ Invoice
✅ Approval
✅ Funds Reserved
✅ Delivered
✅ Paid
```

---

# API Mapping

## /api/connect

Purpose:

```text
Health Check
```

Frontend Usage:

```text
Connected to XRPL Testnet
```

Optional.

---

## /api/generate-wallet

Purpose:

```text
Create demo wallets
```

Frontend Usage:

```text
Hidden from judges
```

Developer only.

---

## /api/account-info

Purpose:

```text
Retrieve XRP balances
```

Frontend Usage:

```text
Buyer Balance:
7.999988 XRP

Supplier Balance:
12 XRP
```

Optional dashboard widget.

---

## /api/create-trade

Purpose:

```text
Create trade record
```

Frontend Usage:

```text
Trade Summary
```

---

## /api/treasury-agent

Purpose:

```text
Policy enforcement
```

Frontend Usage:

```text
Approval workflow
```

---

## /api/create-escrow

Purpose:

```text
Reserve buyer funds
```

Frontend Usage:

```text
Funds Reserved card
```

---

## /api/release-escrow

Purpose:

```text
Release payment to supplier
```

Frontend Usage:

```text
Confirm Delivery flow
```

---

## /api/create-payment

Purpose:

```text
Technical XRPL payment demo
```

Frontend Usage:

```text
Optional
```

Can be hidden.

---

## /api/transaction-history

Purpose:

```text
Blockchain audit trail
```

Frontend Usage:

```text
Recent Transactions
```

Nice to have.

---

# Do NOT Build

Avoid spending time on:

```text
Authentication
Authorization
JWT
RBAC
Databases
Admin Pages
Email
Notifications
Microservices
Settings Pages
NFT Features
Wallet Management Screens
```

---

# Demo Script

```text
1. Supplier uploads invoice

2. Trade created

3. Treasury Agent validates policy

4. Funds reserved on XRPL

5. Funds locked

6. Delivery confirmed

7. Payment automatically released

8. Supplier receives payment

9. Settlement completed
```

---

# Current Backend Status

```text
✅ XRPL Connected

✅ Wallet Generation

✅ Account Balance Lookup

✅ XRP Transfer

✅ Trade Creation

✅ Treasury Agent

✅ EscrowCreate

✅ EscrowFinish

⬜ Invoice Upload UI

⬜ Trade Dashboard UI

⬜ Delivery Confirmation UI

⬜ AI Extraction UI
```

---

# Final Frontend Deliverable

Build a single page with these sections:

```text
1. Invoice

2. Trade Summary

3. Treasury Agent

4. Funds Reserved

5. Delivery Confirmation

6. Payment Settlement
```

Wire them sequentially to:

```text
create-trade
      ↓
treasury-agent
      ↓
create-escrow
      ↓
release-escrow
```

This maximizes judge understanding, business clarity, and demo impact while keeping implementation effort minimal.