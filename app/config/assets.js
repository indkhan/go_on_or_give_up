// RLUSD issuer on testnet — confirmed from Ripple docs
const RLUSD_ISSUER_TESTNET = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'

export const ASSETS = {
    XRP: {
        id: 'XRP',
        label: 'XRP',
        decimals: 6,
        buildAmount: (value) => {
            // XRP amounts are in drops (1 XRP = 1,000,000 drops), as a string
            return String(Math.floor(Number(value) * 1_000_000))
        }
    },
    RLUSD: {
        id: 'RLUSD',
        label: 'RLUSD',
        decimals: 2,
        issuer: RLUSD_ISSUER_TESTNET,
        buildAmount: (value) => {
            // IOU amounts are objects with currency, issuer, value
            return {
                currency: 'USD',
                issuer: RLUSD_ISSUER_TESTNET,
                value: String(value)
            }
        }
    }
}

export const ASSET_LIST = Object.values(ASSETS)

export const DEFAULT_ASSET = ASSETS.XRP
