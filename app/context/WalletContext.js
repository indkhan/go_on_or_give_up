'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

const WalletContext =
  createContext(null)

export function WalletProvider({
  children
}) {

  const [
    walletManager,
    setWalletManager
  ] = useState(null)

  const [
    connected,
    setConnected
  ] = useState(false)

  const [
    accountAddress,
    setAccountAddress
  ] = useState(null)

  const [
    walletName,
    setWalletName
  ] = useState(null)

  const [
    error,
    setError
  ] = useState(null)


  useEffect(() => {
    const saved = localStorage.getItem('xrpl_address')
    if (saved) {
      setAccountAddress(saved)
      setWalletName(localStorage.getItem('xrpl_wallet') || 'XRPL Wallet')
    }
  }, [])

  useEffect(() => {

    let manager = null

    async function initializeWallet() {

      if (typeof window === 'undefined') {
        return
      }

      try {

        const xrplConnect =
          await import('xrpl-connect')
        console.log(
          'XRPL Connect exports:',
          xrplConnect
        )

        const WalletManager =
          xrplConnect.WalletManager
        console.log(
          'XRPL Connect exports:',
          Object.keys(xrplConnect)
        )

        const CrossmarkAdapter =
          xrplConnect.CrossmarkAdapter

        const adapters = [
          new CrossmarkAdapter()
        ]

        manager =
          new WalletManager({
            adapters,
            network: 'testnet',
            autoConnect: false
          })

        console.log(
          'Manager created:',
          manager
        )

        manager.on(
          'connect',
          account => {

            console.log(
              'Connected:',
              account
            )

            setConnected(true)
            setAccountAddress(account.address)
            setWalletName(account.wallet || 'XRPL Wallet')
            localStorage.setItem('xrpl_address', account.address)
            localStorage.setItem('xrpl_wallet', account.wallet || 'XRPL Wallet')
          }
        )

        manager.on(
          'disconnect',
          () => {
            setConnected(false)
            setAccountAddress(null)
            setWalletName(null)
            localStorage.removeItem('xrpl_address')
            localStorage.removeItem('xrpl_wallet')
          }
        )

        manager.on(
          'error',
          err => {

            console.error(err)

            setError(err)
          }
        )

        setWalletManager(
          manager
        )

      }
      catch (err) {

        console.error(
          'XRPL Connect init failed:',
          err
        )

        setError(err)
      }
    }

    initializeWallet()

    return () => {
      try {
        manager?.disconnect?.()
      }
      catch (err) {
        console.error(err)
      }
    }

  }, [])

  async function connect() {

    if (!walletManager) {
      return
    }

    try {

      setError(null)

      await walletManager.connect()

    }
    catch (err) {

      console.error(err)

      setError(err)
    }
  }

  async function disconnect() {

    if (!walletManager) {
      return
    }

    try {

      await walletManager.disconnect()

    }
    catch (err) {

      console.error(err)

      setError(err)
    }
  }

  async function sign(tx) {

    if (!walletManager) {
      throw new Error('No wallet connected')
    }

    try {

      return await walletManager.sign(tx)

    }
    catch (err) {

      if (err.code !== 'SIGN_FAILED') {
        setError(err)
      }

      throw err
    }
  }

  return (
    <WalletContext.Provider
      value={{
        connected,
        accountAddress,
        walletName,
        walletManager,
        error,
        connect,
        disconnect,
        sign
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {

  const context =
    useContext(WalletContext)

  if (!context) {
    throw new Error(
      'useWallet must be used within WalletProvider'
    )
  }

  return context
}
