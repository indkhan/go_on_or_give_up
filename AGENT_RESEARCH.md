# Agentic Research — TradeFlow AI's Treasury Agent

> **Scope of this doc:** *only the agentic component* of TradeFlow AI — the **Treasury Agent** that, after the AI has
> read an invoice, autonomously runs compliance + policy checks and then executes the on-chain settlement action
> inside institutional guardrails. This is the "Agent Financial Infrastructure" pillar (`proj.md` §Use Cases) applied
> to trade finance. The doc/escrow/UI parts of TradeFlow are out of scope here.
>
> The trade-finance flow is the *frame*; the question this doc answers is: **what does the agent need to exist, act
> on-chain, and be trusted by an institution — and what already exists that we can reuse?**

---

## 0. TL;DR

- **The pillar is explicitly "not about building AI."** It's about the *financial rails an agent needs to act
  autonomously*: verified identity, spending controls, compliant settlement, audit trails. (`proj.md:33`)
- **The one hard requirement (must-have to qualify):** *at least one on-chain transaction executed autonomously by an
  agent within institutional guardrails* — spending limits / policy enforcement / compliance checks / audit trails.
- **In TradeFlow, the agent's autonomous on-chain tx = funding/releasing the escrow** (`EscrowCreate` / `EscrowFinish`,
  or a `Payment`), gated by policy. TradeFlow's Treasury Agent naturally hits **all four** guardrail types, which is
  the strongest possible answer to this requirement.
- **We don't build the rails from scratch.** t54-labs ships the agent payment rail (`x402-xrpl`), an agent CLI +
  Claude skills (`rlusd-cli` / `rlusd-skills`) whose design pattern we should copy, and there's an autonomous-credit
  product (ClawCredit). XRPL ships agent docs tooling (MCP + Skills).
- **The guardrails are XRPL-native primitives** (no smart contracts): Credentials (XLS-70) + Permissioned Domains
  (XLS-80) + DepositPreauth = KYA/whitelist/compliance; spending caps + approval thresholds = our policy engine;
  Batch (XLS-56) = atomic agent ops; x402 = optional pay-per-use rail.
- **Settlement-asset feasibility is tracked separately** (RLUSD-in-escrow needs an issuer flag — see memory
  `rlusd-tokenescrow-flag-blocker`). That's a settlement concern, not an agent concern; the agent logic is identical
  whichever asset we settle in.

---

## 1. What "the agentic thing" is in TradeFlow

The Treasury Agent is an autonomous policy-and-compliance gate between an **invoice/payment intent** and an
**on-chain settlement**. The loop (from your spec):

```
Invoice arrives (structured JSON from the doc-AI)
  → agent verifies amount  (matches PO / within expected range)
  → check spending policy   (per-supplier cap, daily/total cap, approval threshold)
  → check supplier whitelist (on-chain: does supplier hold the required Credential / domain membership?)
  → compliance / KYA-KYC    (buyer & supplier verified; optional sanctions screen)
  → DECISION:
       amount < auto-approve threshold AND all checks pass
            → agent autonomously submits the on-chain tx  ←★ the required "agent on-chain tx"
       else → route to a human treasury approver (prepare → review → execute)
  → on shipment confirmation → agent autonomously submits release tx
  → every check + decision + tx hash → append-only AUDIT TRAIL
```

This is *exactly* the brief's "Agent Wallets with Spending Policies" + "Regulated Settlement for Autonomous Payments"
angles, fused into a treasury workflow. Agent integration inside the Payments/Credit pillars is *also* explicitly
rewarded under Creativity (`proj.md:40`).

**Why it scores:** it produces a real on-chain tx (40% viability), uses 3–4 real amendments (30% technical), and the
"policy-controlled AI agent doing treasury" narrative is one of the three pitches the brief-writers flag as "strong."

---

## 2. The guardrails — what the agent needs, mapped to XRPL primitives

XRPL has **no smart contracts**; guardrails are built from native transaction types + amendments + off-chain policy.

### 2.1 Spending controls (limits, thresholds, jurisdiction) — "Agent Wallets with Spending Policies"
- **Not a single XRPL feature** — it's our policy engine that runs *before* signing. The pattern to copy is t54's
  required spending cap: x402 fetch refuses any payment above `--max-value`. Generalize that to: per-supplier cap,
  daily/cumulative cap, auto-approve threshold, allowed-currency, allowed-destination.
- **Scoped agent wallet:** the agent signs from a dedicated wallet funded only with the working budget. Optionally use
  **`SignerListSet` (multisign)** so large releases need a human co-signer, or **RegularKey** so the agent key can be
  rotated/revoked without touching the master key.
- **Atomic, all-or-nothing actions** via **Batch (XLS-56)** — e.g. fund-escrow + write-audit-memo, or fund a
  sub-agent + set its permissions, in one tx that either fully succeeds or fully fails (mode `tfAllOrNothing`).

### 2.2 Identity & whitelist & compliance (KYA/KYC) — "Know Your Agent"
- **Credentials (XLS-70):** issuer-signed, **non-transferable** on-chain attestations.
  `CredentialCreate` (issuer→subject, `CredentialType` hex, `Expiration`, `URI`) → `CredentialAccept` (subject) →
  `CredentialDelete` (revoke). A payment can carry `CredentialIDs: [...]`. *Use:* issue a "KYC"/"verified-supplier"
  credential to the supplier; the agent checks the supplier holds a valid one before releasing funds. Also: issue a
  **KYA credential to the agent's own wallet** so counterparties can verify *it*.
- **Permissioned Domains (XLS-80):** `PermissionedDomainSet` defines a membership set by *which credentials you must
  hold* (e.g. "KYC OR AML"). *Use:* a "approved-suppliers" or "trade-finance-eligible" domain; whitelist check =
  domain membership, evaluated on-chain. Built on Credentials (XLS-70 is a prerequisite).
- **DepositPreauth + asfDepositAuth:** an account that only accepts payments from authorized/credentialed senders
  (`AuthorizeCredentials: [{Credential:{Issuer,CredentialType}}]`). *Use:* the supplier/escrow only accepts funds
  from a compliant buyer/agent — compliance enforced *by the ledger*, not just our app.
- **DID (XLS-40, `DIDSet`)** is named in the brief for KYA but Credentials are simpler and already demoed; treat DID
  as optional polish.
- **Sanctions screening** is off-chain (no XRPL primitive) — the agent calls a screening API as a policy step and
  records the verdict in the audit trail. (Could be paid per-call via x402; see §2.4.)

### 2.3 Audit trail
- On-chain: attach a hash/reference of the decision to the settlement tx via **`Memos`** (and/or bind to an invoice
  via `InvoiceID = SHA256(invoiceId)`). Anyone can later verify the tx ↔ invoice ↔ policy-decision linkage.
- Off-chain: append-only log of (intent, every check + result, plan hash, signer, tx hash, ledger index). The
  x402scan indexer pattern (cloned in `research/repos/x402-xrpl`) is a reusable way to render a live audit dashboard.

### 2.4 Optional: x402 + agent-to-agent (only if we extend)
- **x402** = HTTP-402 pay-per-request rail for agents. On XRPL it's a **presigned Payment tx** settled by a
  **facilitator**. Relevant to TradeFlow only if the agent *pays for services* autonomously (e.g. a sanctions/data
  API, or charging buyers per settlement). Not core to the trade-finance escrow flow, but a clean way to show a second
  autonomous agent payment if we want more "agent" surface area.
- **Agent-to-agent funding/delegation:** a parent treasury agent funds + scopes sub-agents (one per corridor/supplier)
  via Batch + Credentials. A credible "governed sub-agents" story for the pitch; optional.

---

## 3. The agent tooling ecosystem (reuse, don't rebuild)

Cloned locally under `research/repos/`. The agent finance stack is largely built by **t54-labs** + XRPL DevRel.

### 3.1 `x402-xrpl` SDK (npm `x402-xrpl@^0.1.1`) — the agent payment rail
- Buyer side: `x402Fetch({ wallet, network, wsUrl, maxValue, paymentRequirementsSelector, paymentHeaderFactory })`,
  `XRPLPresignedPaymentPayer` (`.preparePayment()`), `decodePaymentRequiredHeader`, `decodePaymentResponseHeader`,
  `resolveCurrencyCode("RLUSD",{allowUtf8Symbol})`.
- Seller side: `requirePayment({ path, facilitatorUrl, payToAddress })` middleware for **Express** + **FastAPI**.
- On-chain fingerprint: facilitator `SourceTag` (t54 mainnet = `804681468`) + `InvoiceID`/`Memos` invoice binding
  (replay protection). Networks: `xrpl:0/1/2`. Hosted facilitator: `https://xrpl-facilitator-mainnet.t54.ai`
  (`/supported`, `/verify`, `/settle`). Only needed if we adopt x402 (§2.4).

### 3.2 `rlusd-cli` + `rlusd-skills` — ⭐ the agent design blueprint to copy
- `rlusd-cli` (npm `@rlusd/cli`): TS CLI over `xrpl@4` + `x402-xrpl`; AES-256-GCM encrypted wallets in
  `~/.config/rlusd-cli/wallets`.
- `rlusd-skills` (Claude Code plugin `t54-labs/rlusd-skills`): 11 Skills that route NL prompts → deterministic CLI
  commands. **This is the agent layer pattern, fully worked out.** Steal:
  - **3 layers:** Skills (route) → CLI (deterministic JSON commands) → registry (chain/asset/policy facts).
  - **`prepare → review → execute` for every write.** `prepare` emits a **plan** with a deterministic
    `plan_id = hash(command, chain, action, params, intent, warnings)`. `execute` reloads, re-hashes
    (`PLAN_INTEGRITY_MISMATCH` if tampered), and needs a matching `--confirm-plan-id`. → this *is* our
    approval-threshold + audit mechanism, institution-credible.
  - **Agent-readable envelope** on every command: `{ ok, command, chain, timestamp, data, warnings, next }`
    (errors add `error.{code,message,retryable}`). `next` suggests the follow-up command → makes it agent-navigable.
    (`rlusd-cli/src/agent/envelope.ts`.)
  - **Spending cap is first-class & enforced before signing.** Never silently pay more.
  - **Signer secrets never in plans;** decrypt only at execute; confirm with wait/receipt, not "submitted == done."

### 3.3 ClawCredit (`@t54-labs/clawcredit-sdk`, claw.credit) — autonomous agent credit
- Agent-native risk engine; agents apply for + draw credit lines autonomously (XRPL/Solana/Base, USDC). Ships a
  machine-readable `SKILL.md`. Relevant only if we add the "supplier financing / pay-supplier-early" credit angle and
  want the agent to extend credit autonomously. Reference/partner, optional.

### 3.4 XRPL official agent tooling
- **MCP servers:** `https://xrpl.org/mcp` (xrpl.org docs) + **Context7** (`context7.com/?q=xrpl`) — wire into our
  coding agent for live XRPL docs. `llms.txt` at `xrpl.org/llms.txt`; every doc has a `.md` variant.
- **Skills:** XRPL Commons "XRPL Development Skill" (`github.com/XRPL-Commons/xrpl-dev-skills`).

### 3.5 Supporting kit
- `xrpl-js-python-simple-scripts` (RippleDevRel): copy-paste tx scripts; `devnet/{credentials,permissionedDomains,
  batch,tokenEscrow}.js` are our fastest path to the guardrail txs. `xrpl-connect`: wallet UI for the human-approver.
  SDKs: `xrpl.js` (TS), `xrpl-py`, `xrpl4j`.

---

## 4. How we actually build the agent

**Agent host options (pick one):**
1. **Claude Code Skill / MCP tool** that calls a thin TradeFlow CLI/tooling layer (mirrors rlusd-skills). Demos great:
   "talk to the treasury agent, watch it transact." Fastest credible path.
2. **Standalone LLM agent loop** (Anthropic SDK) with a fixed tool set, run as a backend service the web app calls.
   Better for an unattended/automated demo.
3. **Hybrid:** backend agent service for autonomy + a Skill for live interactive demo.

**Tools the agent needs (deterministic, JSON-enveloped):**
- `verify_invoice(intent)` → amount/PO/date consistency verdict (calls the doc-AI).
- `check_policy(intent)` → pass/fail + which caps/thresholds applied.
- `check_compliance(buyer, supplier)` → on-chain credential/domain lookup + sanctions verdict.
- `prepare_settlement(intent)` → plan with `plan_id` (no side effects).
- `execute_settlement(plan_id, confirm)` → signs + submits `EscrowCreate`/`EscrowFinish`/`Payment`; returns tx hash.
- `wait_receipt(hash)` → confirms validation.
- All append to `audit_log`.

**Model:** build the doc-AI + agent reasoning on the latest Claude models (`claude-opus-4-8`, or `claude-sonnet-4-6`
for cheaper bulk). When implementing, pull exact API/model/tool-use details from the `claude-api` skill, not memory.

**The agent design rules to adopt (from t54, §3.2):** deterministic tool surface + JSON envelopes; `prepare→review→
execute` with plan-integrity hash + explicit confirm for over-threshold; required spending cap enforced pre-sign;
signer secrets out of plans/logs; confirm via receipt; registry for changing facts; package as Skill/MCP.

---

## 5. The agent's on-chain transactions (what it autonomously signs)

| Agent action | XRPL tx | Guardrail demonstrated |
| --- | --- | --- |
| Fund escrow after checks pass (< threshold) | `EscrowCreate` (asset, `Condition`, `FinishAfter`/`CancelAfter`, `InvoiceID`, `Memos`) | spending limit + policy + compliance + audit (all four) |
| Release on shipment confirmation | `EscrowFinish` (`Condition` + `Fulfillment`) | autonomous conditional settlement |
| Refund if deal collapses | `EscrowCancel` after `CancelAfter` | policy-driven unwind |
| Issue/verify supplier KYA | `CredentialCreate` / read `account_objects type:credential` | KYA / whitelist |
| Atomic fund + audit memo, or fund + scope sub-agent | `Batch` (`tfAllOrNothing`) | governed, atomic ops |
| (optional) Pay for a service per-call | `Payment` via x402 presign | regulated autonomous payment |

At least one of these executed by the agent, unattended, with the checks logged = the brief's hard requirement met.

---

## 6. What we need (agentic shopping list)

- **Libs:** Node ≥ 20, TS; `xrpl@^4.6`; Anthropic SDK (agent + doc-AI); `five-bells-condition` (escrow conditions);
  optional `x402-xrpl` (if §2.4), `@rlusd/cli` + `rlusd-skills` (drop-in capability), `xrpl-connect` (approver UI).
- **Wallets (testnet, `client.fundWallet()`):** treasury-agent signer (scoped budget), KYA/compliance issuer, buyer,
  supplier. Optionally a human-approver (multisign co-signer).
- **Agent host:** Claude Skill/MCP or backend loop; wire xrpl.org MCP + Context7 for live docs.
- **Audit store:** append-only log/DB; optional x402scan indexer for a live dashboard.

---

## 7. Open questions / day-1 mentor asks (agent-specific)

1. **Does the agent need its own on-chain KYA credential**, or is policy-side identity enough for the demo?
2. **Credentials (XLS-70) + Permissioned Domains (XLS-80) availability on Testnet** (scripts target Devnet). If
   absent on testnet, fall back to DepositPreauth (account-based whitelist) or record credentials on devnet.
3. **Multisign for over-threshold releases** — do judges value a human co-sign demo, or is auto-approve cleaner to show?
4. **x402 (§2.4)** — worth adding a second autonomous agent payment, and is there a testnet/devnet facilitator URL?
5. Settlement asset is tracked separately — see memory `rlusd-tokenescrow-flag-blocker` (RLUSD escrow needs an issuer
   flag). Agent logic is asset-agnostic, so this doesn't block agent work.

---

## 8. Build order (agentic component)

1. **Tool layer (½ day):** deterministic, JSON-enveloped tools `verify_invoice / check_policy / check_compliance /
   prepare_settlement / execute_settlement / wait_receipt`, over `xrpl.js`, with an append-only audit log.
2. **Policy engine (½ day):** per-supplier + daily caps, auto-approve threshold, allowed-asset/destination; enforced
   before signing; `prepare→review→execute` + plan-integrity hash.
3. **On-chain autonomy (½–1 day):** agent signs `EscrowCreate`/`EscrowFinish` (or `Payment`) from the scoped wallet on
   testnet — the required autonomous on-chain tx. Bind `InvoiceID`/`Memos` for the audit link.
4. **KYA/whitelist (½ day):** issue+accept Credentials; gate via Permissioned Domain / DepositPreauth; agent reads
   them as the whitelist check.
5. **Agent host + demo (1 day):** wrap as a Claude Skill / MCP tool (or backend loop); "invoice in → checks → tx out"
   live, plus a blocked over-threshold case routed to human approval. Audit trail on screen.

---

## 9. Reference index

**Cloned (`research/repos/`):** `rlusd-cli` (study `src/agent/envelope.ts`, `src/commands/x402.cmd.ts`,
`docs/FRAMEWORK.md`) · `rlusd-skills` (`docs/architecture.md`, `docs/security.md`) · `x402-xrpl` (SDK spec
`packages/xrpl-x402-standard.md` + explorer for audit dashboard) · `xrpl-js-python-simple-scripts/devnet/*` · `xrpl-connect`.

**External:**
- Agent pillar brief: `proj.md` §"Agent Financial Infrastructure" (lines 33–40).
- x402: SDK https://github.com/t54-labs/x402-xrpl · facilitator https://xrpl-x402.t54.ai/ (scheme `/docs/xrpl-scheme`).
- ClawCredit https://www.claw.credit · x402Secure https://www.x402secure.com/ · OpenWallet https://openwallet.sh
- XRPL AI tools https://xrpl.org/resources/dev-tools/ai-tools · MCP https://xrpl.org/mcp · `xrpl.org/llms.txt`
- Standards (https://github.com/XRPLF/XRPL-Standards): XLS-70 Credentials, XLS-80 Permissioned Domains, XLS-56 Batch,
  XLS-40 DID, XLS-33 MPT, XLS-85 TokenEscrow.
- Credentials/Domains/Batch tx refs: https://xrpl.org/docs/references/protocol/transactions/types
- Mentors: maximed@ripple.com (Hackathon Lead, DevRel), wlevitt@ripple.com.
