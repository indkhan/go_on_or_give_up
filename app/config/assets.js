const RLUSD_ISSUER_TESTNET = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV'
const RLUSD_CURRENCY_HEX = '524C555344000000000000000000000000000000'

export const ASSETS = {
    XRP: {
        id: 'XRP',
        label: 'XRP',
        decimals: 6,
        settlementType: 'escrow',
        buildAmount: (value) => String(Math.floor(Number(value) * 1_000_000))
    },
    RLUSD: {
        id: 'RLUSD',
        label: 'RLUSD',
        decimals: 2,
        settlementType: 'check',
        issuer: RLUSD_ISSUER_TESTNET,
        currency: RLUSD_CURRENCY_HEX,
        buildAmount: (value) => ({
            currency: RLUSD_CURRENCY_HEX,
            issuer: RLUSD_ISSUER_TESTNET,
            value: String(value)
        })
    }
}

export const ASSET_LIST = Object.values(ASSETS)

export const DEFAULT_ASSET = ASSETS.XRP
