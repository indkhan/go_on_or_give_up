import { Inter } from 'next/font/google'
import 'maplibre-gl/dist/maplibre-gl.css'
import './globals.css'
import { WalletProvider } from './context/WalletContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'TradeFlow AI',
    description: 'AI-Assisted Trade Finance on XRPL',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${inter.className} h-screen`}>
                <WalletProvider>
                    {children}
                </WalletProvider>
            </body>
        </html>
    )
}
