import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const DB_PATH = join(process.cwd(), '.trade-state.json')

function load() {
    try {
        return existsSync(DB_PATH) ? JSON.parse(readFileSync(DB_PATH, 'utf8')) : {}
    } catch { return {} }
}

function save(data) {
    writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const tradeId = searchParams.get('tradeId')
    if (!tradeId) return NextResponse.json({ error: 'tradeId required' }, { status: 400 })
    const trades = load()
    return NextResponse.json(trades[tradeId] ?? {})
}

export async function POST(request) {
    const { tradeId, ...patch } = await request.json()
    if (!tradeId) return NextResponse.json({ error: 'tradeId required' }, { status: 400 })
    const trades = load()
    // Remove null values from patch (used to clear fields)
    const cleaned = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== null))
    const removed = Object.keys(patch).filter(k => patch[k] === null)
    const current = { ...trades[tradeId], ...cleaned }
    removed.forEach(k => delete current[k])
    trades[tradeId] = current
    save(trades)
    return NextResponse.json(current)
}
