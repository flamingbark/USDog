"use client";

import { useAccount } from 'wagmi';

const WalletConnection = () => {
  const { isConnected } = useAccount();

  // Only show overlay if not connected - but since we have the connect button in navigation,
  // this overlay is no longer needed. Keeping it simple for now.
  if (!isConnected) {
    return null;
  }

  return null;
};

export default WalletConnection;