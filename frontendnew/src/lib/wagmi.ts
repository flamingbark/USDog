import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { bsc, bscTestnet } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'USDog Stablecoin',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [bsc, bscTestnet],
  ssr: true,
})