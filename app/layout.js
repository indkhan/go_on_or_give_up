import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { WalletProvider } from './context/WalletContext'
import { RoleProvider } from './context/RoleContext'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
})

const display = Space_Grotesk({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap',
})

const mono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
})

export const metadata = {
    title: 'TradeFlow',
    description: 'AI-assisted trade finance, settled on XRPL',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" data-theme="tradeflow">
            <body className={`${inter.variable} ${display.variable} ${mono.variable} antialiased`}>
                <WalletProvider>
                    <RoleProvider>
                        {children}
                    </RoleProvider>
                </WalletProvider>
            </body>
        </html>
    )
}
