"use client";

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ethers } from 'ethers';
import { useStablecoin } from '@/hooks/useStablecoin';
import { CONTRACT_ADDRESSES, ILK_DOGE, ILK_SHIB } from '@/lib/contracts';
import { useChainId } from 'wagmi';

interface CollateralSelectionProps {
  initialCollateral?: 'DOGE' | 'SHIB'
}

const CollateralSelection = ({ initialCollateral }: CollateralSelectionProps) => {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const appChainId = useChainId();
  const addresses = appChainId === 56 ? CONTRACT_ADDRESSES.bsc : CONTRACT_ADDRESSES.bscTestnet;

  const [selectedCollateral, setSelectedCollateral] = useState<'DOGE' | 'SHIB'>(initialCollateral ?? 'SHIB');

  // Ensure selection follows initialCollateral even if it becomes available after first render
  useEffect(() => {
    if (initialCollateral && initialCollateral !== selectedCollateral) {
      setSelectedCollateral(initialCollateral);
    }
  }, [initialCollateral]);

  const [depositAmount, setDepositAmount] = useState('');
  const [lockAmount, setLockAmount] = useState('');
  const [unlockAmount, setUnlockAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  
  // Individual loading states for each operation
  const [isApproving, setIsApproving] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Use the stablecoin hook with selected collateral
  const {
    ink,
    art,
    depositCollateral,
    approveToken,
    authorizeVat,
    lockCollateral,
    unlockCollateral,
    generateStablecoin,
    generateAndSendStablecoin,
    repayStablecoin,
    withdrawCollateral,
    isPending,
    refetchData
  } = useStablecoin(selectedCollateral);

  // Read balances directly using useReadContract
  const { data: usdogBalance, isLoading: usdogLoading, error: usdogError } = useReadContract({
    address: addresses.stablecoin as `0x${string}`,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { refetchInterval: 5000, refetchOnWindowFocus: true },
  });

  const { data: tokenBalance, isLoading: tokenLoading, error: tokenError } = useReadContract({
    address: (selectedCollateral === 'DOGE' ? addresses.dogeToken : addresses.shibToken) as `0x${string}`,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { refetchInterval: 5000, refetchOnWindowFocus: true },
  });

  const { data: collateralBalance } = useReadContract({
    address: addresses.vat as `0x${string}`,
    abi: [
      {
        name: 'gem',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'ilk', type: 'bytes32' },
          { name: 'usr', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'gem',
    args: address ? [selectedCollateral === 'DOGE' ? ILK_DOGE as `0x${string}` : ILK_SHIB as `0x${string}`, address as `0x${string}`] : undefined,
    query: { refetchInterval: 5000, refetchOnWindowFocus: true },
  });

  // Read Vat.ilks for current collateral to compute safe mint limit precisely
  const currentIlkBytes = (selectedCollateral === 'DOGE' ? ILK_DOGE : ILK_SHIB) as `0x${string}`;
  const { data: ilkData } = useReadContract({
    address: addresses.vat as `0x${string}`,
    abi: [
      {
        name: 'ilks',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'bytes32' }],
        outputs: [
          { name: 'Art',  type: 'uint256' }, // total normalized debt [wad]
          { name: 'rate', type: 'uint256' }, // accumulated rate      [ray]
          { name: 'spot', type: 'uint256' }, // price with margin     [ray]
          { name: 'line', type: 'uint256' }, // debt ceiling          [rad]
          { name: 'dust', type: 'uint256' }  // min debt              [rad]
        ]
      }
    ],
    functionName: 'ilks',
    args: [currentIlkBytes],
    query: { refetchInterval: 5000, refetchOnWindowFocus: true },
  });

  // Read raw urns(ilk, user) to avoid precision loss from format/parse round-trip
  const { data: urnRaw } = useReadContract({
    address: addresses.vat as `0x${string}`,
    abi: [
      {
        name: 'urns',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'ilk', type: 'bytes32' }, { name: 'urn', type: 'address' }],
        outputs: [{ name: 'ink', type: 'uint256' }, { name: 'art', type: 'uint256' }]
      }
    ],
    functionName: 'urns',
    args: address ? [currentIlkBytes, address as `0x${string}`] : undefined,
    query: { refetchInterval: 5000, refetchOnWindowFocus: true },
  });

  // Create wrapper functions for specific collateral types with refresh
  const depositDOGE = async (amount: string) => {
    await depositCollateral(amount, 'DOGE');
    setTimeout(() => refetchData(), 2000);
  };
  const depositSHIB = async (amount: string) => {
    await depositCollateral(amount, 'SHIB');
    setTimeout(() => refetchData(), 2000);
  };
  const lockDOGE = async (amount: string) => {
    await lockCollateral(amount, ILK_DOGE);
    setTimeout(() => refetchData(), 2000);
  };
  const lockSHIB = async (amount: string) => {
    await lockCollateral(amount, ILK_SHIB);
    setTimeout(() => refetchData(), 2000);
  };
  const unlockDOGE = async (amount: string) => {
    await unlockCollateral(amount, ILK_DOGE);
    setTimeout(() => refetchData(), 2000);
  };
  const unlockSHIB = async (amount: string) => {
    await unlockCollateral(amount, ILK_SHIB);
    setTimeout(() => refetchData(), 2000);
  };
  const withdrawDOGE = async (amount: string) => {
    await withdrawCollateral(amount, 'DOGE');
    setTimeout(() => refetchData(), 2000);
  };
  const withdrawSHIB = async (amount: string) => {
    await withdrawCollateral(amount, 'SHIB');
    setTimeout(() => refetchData(), 2000);
  };
  const mintDOGE = async (amount: string) => {
    // Mint internally and immediately exit to the connected wallet
    if (!address) throw new Error('Wallet not connected');
    await generateAndSendStablecoin(amount, ILK_DOGE, address);
    setTimeout(() => refetchData(), 2000);
  };
  const mintSHIB = async (amount: string) => {
    // Mint internally and immediately exit to the connected wallet
    if (!address) throw new Error('Wallet not connected');
    await generateAndSendStablecoin(amount, ILK_SHIB, address);
    setTimeout(() => refetchData(), 2000);
  };
  const repayDOGE = async (amount: string) => {
    await repayStablecoin(amount, ILK_DOGE);
    setTimeout(() => refetchData(), 2000);
  };
  const repaySHIB = async (amount: string) => {
    await repayStablecoin(amount, ILK_SHIB);
    setTimeout(() => refetchData(), 2000);
  };

  // Refresh data when collateral selection changes
  useEffect(() => {
    if (refetchData) {
      refetchData();
    }
  }, [selectedCollateral, refetchData]);


  const formatBalance = (balance: bigint | undefined, decimals: number = 18) => {
    if (!balance) return '0.00';
    const formatted = parseFloat(ethers.formatUnits(balance, decimals));
    // Round to 4 decimal places and remove trailing zeros
    return formatted.toFixed(4).replace(/\.?0+$/, '');
  };

  // Calculate max safe mint using Vat invariants with raw urn values (avoid formatting precision loss):
  // Safety: rate[ray] * art[wad] <= ink[wad] * spot[ray]
  //   => maxArtAllowed[wad] = floor((ink * spot) / rate)
  // Ceiling: (ArtTotal * rate) <= line
  //   => remainingByLine[wad] = floor((line - ArtTotal*rate) / rate)
  // Dust: if art == 0 and new debt > 0 then tab >= dust
  //   => requiredMinArt[wad] = ceil(dust / rate)
  // Apply 0.5% buffer to mitigate rounding-edge reverts.
  const calculateMaxSafeMint = () => {
    try {
      if (!ilkData || !urnRaw) return '0';

      // Read raw urn values from chain (no string formatting round-trip)
      const inkWad = BigInt((urnRaw as any)[0]?.toString() ?? '0'); // [wad]
      const artWad = BigInt((urnRaw as any)[1]?.toString() ?? '0'); // [wad]
      if (inkWad <= 0n) return '0';

      // Ilk parameters
      const ArtTotalWad = BigInt((ilkData as any)[0]?.toString() ?? '0'); // [wad]
      const rateRay     = BigInt((ilkData as any)[1]?.toString() ?? '0'); // [ray]
      const spotRay     = BigInt((ilkData as any)[2]?.toString() ?? '0'); // [ray]
      const lineRad     = BigInt((ilkData as any)[3]?.toString() ?? '0'); // [rad]
      const dustRad     = BigInt((ilkData as any)[4]?.toString() ?? '0'); // [rad]

      if (rateRay === 0n || spotRay === 0n) return '0';

      // Safety headroom
      const maxArtAllowedWad = (inkWad * spotRay) / rateRay; // floor
      let additionalBySafetyWad = maxArtAllowedWad > artWad ? (maxArtAllowedWad - artWad) : 0n;

      // Line headroom
      const currentIlkDebtRad = ArtTotalWad * rateRay;
      const remainingRad = lineRad > currentIlkDebtRad ? (lineRad - currentIlkDebtRad) : 0n;
      const remainingByLineWad = remainingRad / rateRay;

      // Combine
      let additionalWad = additionalBySafetyWad < remainingByLineWad ? additionalBySafetyWad : remainingByLineWad;

      // Dust requirement when opening from zero
      if (dustRad > 0n && artWad === 0n && additionalWad > 0n) {
        const requiredMinArtWad = (dustRad + rateRay - 1n) / rateRay; // ceil
        if (additionalWad < requiredMinArtWad) return '0';
      }

      if (additionalWad <= 0n) return '0';

      // 0.5% buffer
      additionalWad = (additionalWad * 995n) / 1000n;
      if (additionalWad <= 0n) return '0';

      const value = Number(ethers.formatUnits(additionalWad, 18));
      return selectedCollateral === 'SHIB'
        ? value.toFixed(6).replace(/\.?0+$/, '')
        : value.toFixed(4).replace(/\.?0+$/, '');
    } catch {
      return '0';
    }
  };

  // Calculate max safe unlock from current state:
  // Must maintain: rate * art <= (ink - unlock) * spot
  // => minInkRequired = ceil(rate * art / spot)
  // => maxUnlock = max(0, ink - minInkRequired), with small safety buffer
  const calculateMaxSafeUnlock = () => {
    try {
      if (!ilkData || !urnRaw) return '0';

      const inkWad = BigInt((urnRaw as any)[0]?.toString() ?? '0'); // [wad]
      const artWad = BigInt((urnRaw as any)[1]?.toString() ?? '0'); // [wad]
      const rateRay = BigInt((ilkData as any)[1]?.toString() ?? '0'); // [ray]
      const spotRay = BigInt((ilkData as any)[2]?.toString() ?? '0'); // [ray]

      if (inkWad === 0n) return '0';
      if (artWad === 0n || rateRay === 0n || spotRay === 0n) {
        const value = Number(ethers.formatUnits(inkWad, 18));
        return selectedCollateral === 'SHIB'
          ? value.toFixed(6).replace(/\.?0+$/, '')
          : value.toFixed(4).replace(/\.?0+$/, '');
      }

      const minInkRequired = (rateRay * artWad + (spotRay - 1n)) / spotRay; // ceil
      let maxUnlockWad = inkWad > minInkRequired ? (inkWad - minInkRequired) : 0n;

      // 0.5% buffer
      maxUnlockWad = (maxUnlockWad * 995n) / 1000n;

      const value = Number(ethers.formatUnits(maxUnlockWad, 18));
      return selectedCollateral === 'SHIB'
        ? value.toFixed(6).replace(/\.?0+$/, '')
        : value.toFixed(4).replace(/\.?0+$/, '');
    } catch {
      return '0';
    }
  };

  const handleApprove = async () => {
    if (!depositAmount) return;

    setIsApproving(true);
    try {
      console.log("🎯 Starting approval process...");
      await approveToken(depositAmount, selectedCollateral);
      console.log("✅ Approval successful!");
      alert("Approval successful! You can now deposit the tokens.");
    } catch (error: any) {
      console.error('❌ Approval failed:', error);
      alert(`Approval failed: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      console.log("🎯 Starting Vat authorization...");
      await authorizeVat();
      console.log("✅ Vat authorization successful!");
      alert("Authorization successful! You can now mint USDog.");
    } catch (error: any) {
      console.error('❌ Authorization failed:', error);
      alert(`Authorization failed: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;

    setIsDepositing(true);
    try {
      console.log("🎯 Starting deposit process...");
      if (selectedCollateral === 'DOGE') {
        await depositDOGE(depositAmount);
        console.log("✅ DOGE deposit successful!");
      } else {
        await depositSHIB(depositAmount);
        console.log("✅ SHIB deposit successful!");
      }
      setDepositAmount('');
    } catch (error: any) {
      console.error('❌ Deposit failed:', error);
      alert(`Deposit failed: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleLock = async () => {
    if (!lockAmount) return;

    setIsLocking(true);
    try {
      if (selectedCollateral === 'DOGE') {
        await lockDOGE(lockAmount);
      } else {
        await lockSHIB(lockAmount);
      }
      setLockAmount('');
    } catch (error: any) {
      console.error('❌ Lock failed:', error);
      alert(`Lock failed: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockAmount) return;

    setIsUnlocking(true);
    try {
      // Safety checks
      if (ink === '0') {
        alert('⚠️ No locked collateral found!');
        return;
      }

      const lockedAmount = parseFloat(ink);
      const requestedUnlock = parseFloat(unlockAmount);

      if (requestedUnlock > lockedAmount) {
        alert(`⚠️ Unlock amount too high! You only have ${formatBalance(BigInt(Math.floor(lockedAmount * 1e18)), 18)} ${selectedCollateral} locked.`);
        return;
      }

      // Strict safety check using on-chain invariants to avoid Vat/not-safe
      const maxSafeUnlockStr = calculateMaxSafeUnlock();
      const maxSafeUnlock = parseFloat(maxSafeUnlockStr);
      if (requestedUnlock > maxSafeUnlock) {
        alert(`❌ Unlock would make the vault unsafe.\n\nMax safe unlock: ${maxSafeUnlockStr} ${selectedCollateral}\nTip: Repay some USDog first, or unlock a smaller amount.`);
        return;
      }

      if (selectedCollateral === 'DOGE') {
        await unlockDOGE(unlockAmount);
      } else {
        await unlockSHIB(unlockAmount);
      }
      setUnlockAmount('');
    } catch (error: any) {
      console.error('❌ Unlock failed:', error);
      alert(`Unlock failed: ${error.message || 'Unknown error'}.`);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleWithdrawCollateral = async () => {
    if (!withdrawAmount) return;

    try {
      // Safety check: ensure user has available (deposited but unlocked) collateral
      const availableCollateral = formatBalance(collateralBalance as bigint | undefined, 18);
      const requestedWithdraw = parseFloat(withdrawAmount);
      
      if (parseFloat(availableCollateral) === 0) {
        alert('⚠️ No available collateral to withdraw! Deposit collateral first or unlock locked collateral.');
        return;
      }

      if (requestedWithdraw > parseFloat(availableCollateral)) {
        alert(`⚠️ Withdraw amount too high! You only have ${availableCollateral} ${selectedCollateral} available to withdraw.`);
        return;
      }

      setIsWithdrawing(true);
      
      console.log('💸 Withdrawing collateral...');
      if (selectedCollateral === 'DOGE') {
        await withdrawDOGE(withdrawAmount);
      } else {
        await withdrawSHIB(withdrawAmount);
      }
      setWithdrawAmount('');
      console.log('✅ Withdraw successful!');
    } catch (error: any) {
      console.error('❌ Withdraw failed:', error);
      alert(`Withdraw failed: ${error.message || 'Unknown error'}.`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleMint = async () => {
    if (!mintAmount) return;

    try {
      // Safety check: ensure user has locked collateral
      if (ink === '0') {
        alert('⚠️ No locked collateral found! Please lock collateral first before minting USDog.');
        return;
      }

      // Ultra-conservative safety check to avoid "Vat/not-safe" errors
      const lockedValue = parseFloat(ink);
      const requestedMint = parseFloat(mintAmount);
      const maxSafeMint = parseFloat(calculateMaxSafeMint());
      
      if (requestedMint > maxSafeMint) {
        alert(`⚠️ Mint amount too high! The contract enforces very strict safety limits.\n\nYou have: ${formatBalance(BigInt(Math.floor(parseFloat(ink) * 1e18)), 18)} ${selectedCollateral} locked\nMax safe mint: ${calculateMaxSafeMint()} USDog\n\nTry the suggested max amount to avoid "not-safe" errors.`);
        return;
      }

      // Additional ultra-conservative check - warn if close to limit
      if (requestedMint > maxSafeMint * 0.8) {
        const confirmed = confirm(`⚠️ You're minting ${requestedMint} USDog which is close to the limit of ${maxSafeMint} USDog.\n\nThe contract has very strict safety requirements. Continue anyway?`);
        if (!confirmed) return;
      }

      setIsMinting(true);
      
      console.log('🏦 Minting USDog...');
      if (selectedCollateral === 'DOGE') {
        await mintDOGE(mintAmount);
      } else {
        await mintSHIB(mintAmount);
      }
      setMintAmount('');
      console.log('✅ Mint successful!');
    } catch (error: any) {
      console.error('❌ Mint failed:', error);
      
      if (error.message?.includes('not-safe')) {
        alert('❌ Mint failed: Vault would become unsafe! Try minting a smaller amount or lock more collateral first.');
      } else {
        alert(`Mint failed: ${error.message || 'Unknown error'}. Check console for details.`);
      }
    } finally {
      setIsMinting(false);
    }
  };

  const handleRepay = async () => {
    if (!repayAmount) return;

    try {
      // Safety check: ensure user has debt to repay
      if (art === '0') {
        alert('⚠️ No debt found! You don\'t have any USDog debt to repay.');
        return;
      }

      // Safety check: don't repay more than current debt
      const currentDebt = parseFloat(art);
      const requestedRepay = parseFloat(repayAmount);
      
      if (requestedRepay > currentDebt) {
        alert(`⚠️ Repay amount too high! You only owe ${art} USDog. Try repaying max ${art} USDog.`);
        return;
      }

      // Note: In MakerDAO-style systems, debt repayment uses internal Vat accounting
      // The USDog debt can be repaid directly without needing external USDog tokens
      console.log('💡 Repaying debt using internal Vat accounting...');

      setIsRepaying(true);
      
      console.log('💰 Repaying USDog...');
      if (selectedCollateral === 'DOGE') {
        await repayDOGE(repayAmount);
      } else {
        await repaySHIB(repayAmount);
      }
      setRepayAmount('');
      console.log('✅ Repay successful!');
    } catch (error: any) {
      console.error('❌ Repay failed:', error);
      
      if (error.message?.includes('underflow') || error.message?.includes('overflow')) {
        alert('❌ Repay failed: Arithmetic error! You might be trying to repay more than you owe.');
      } else {
        alert(`Repay failed: ${error.message || 'Unknown error'}. Check console for details.`);
      }
    } finally {
      setIsRepaying(false);
    }
  };


  // Show connection status
  if (!isConnected) {
    return (
      <div className="w-full max-w-[732px] mx-auto p-6 bg-white/60 rounded-2xl border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">Wallet Not Connected</p>
          <p className="text-sm text-gray-500">Please connect your wallet to access the vault</p>
        </div>
      </div>
    );
  }

  // Show network mismatch
  if (walletChainId !== appChainId) {
    return (
      <div className="w-full max-w-[732px] mx-auto p-6 bg-yellow-50 rounded-2xl border border-yellow-200 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="text-center">
          <p className="text-lg font-semibold text-yellow-800 mb-2">Network Mismatch</p>
          <p className="text-sm text-yellow-700">
            Please switch to {appChainId === 56 ? 'BSC Mainnet' : 'BSC Testnet'} to use this vault
          </p>
          <p className="text-xs text-yellow-600 mt-2">
            Connected: {walletChainId === 56 ? 'BSC Mainnet' : walletChainId === 97 ? 'BSC Testnet' : `Chain ${walletChainId}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[732px] mx-auto p-6 bg-white/60 rounded-2xl border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <div className="space-y-6">


        {/* Collateral Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Select Collateral</h3>
          <div className="flex gap-4">
            {['DOGE', 'SHIB'].map((token) => (
              <button
                key={token}
                onClick={() => setSelectedCollateral(token as 'DOGE' | 'SHIB')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedCollateral === token
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {token}
              </button>
            ))}
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/40 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{selectedCollateral} Wallet</p>
            <p className="text-lg font-semibold">
              {tokenLoading ? 'Loading...' : formatBalance(tokenBalance as bigint | undefined, selectedCollateral === 'DOGE' ? 8 : 18)} {selectedCollateral}
            </p>
            {tokenError && <p className="text-xs text-red-600">Error: {tokenError.message}</p>}
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600">Deposited {selectedCollateral}</p>
            <p className="text-lg font-semibold text-blue-800">
              {formatBalance(collateralBalance as bigint | undefined, 18)} {selectedCollateral}
            </p>
            <p className="text-xs text-blue-600">Available to lock</p>
          </div>
          <div className="bg-white/40 p-4 rounded-lg">
            <p className="text-sm text-gray-600">USDog Balance</p>
            <p className="text-lg font-semibold">
              {usdogLoading ? 'Loading...' : formatBalance(usdogBalance as bigint | undefined, 18)} USDog
            </p>
            {usdogError && <p className="text-xs text-red-600">Error: {usdogError.message}</p>}
          </div>
        </div>

        {/* Vault Status & Health */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
          <h4 className="font-semibold mb-3 text-indigo-800">🏛️ Vault Status</h4>
          
          {ink !== '0' || art !== '0' ? (
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-gray-600 mb-1">Locked Collateral</p>
                <p className="font-bold text-lg text-indigo-700">
                  {(() => {
                    const v = BigInt((urnRaw as any)?.[0]?.toString() ?? '0');
                    return formatBalance(v, 18);
                  })()} {selectedCollateral}
                </p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-gray-600 mb-1">Outstanding Debt</p>
                <p className="font-bold text-lg text-purple-700">
                  {(() => {
                    const v = BigInt((urnRaw as any)?.[1]?.toString() ?? '0');
                    return formatBalance(v, 18);
                  })()} USDog
                </p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-gray-600 mb-1">Available Collateral</p>
                <p className="font-bold text-lg text-green-700">
                  {formatBalance(collateralBalance as bigint | undefined, 18)} {selectedCollateral}
                </p>
                <p className="text-xs text-gray-500">Ready to lock</p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-gray-600 mb-1">Max Safe Mint</p>
                <p className="font-bold text-lg text-orange-700">
                  {calculateMaxSafeMint()} USDog
                </p>
                <p className="text-xs text-gray-500">⚠️ Contract enforces strict limits. Start with tiny amounts!</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">No active vault found</p>
              <p className="text-sm text-gray-500">Follow these steps: 1) Deposit → 2) Lock → 3) Mint</p>
            </div>
          )}
        </div>

        {/* Vault Management Sections */}
        
        {/* 1. Deposit Collateral - Two Step Process */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold mb-3 text-green-800">💰 Deposit {selectedCollateral}</h4>
          <p className="text-sm text-green-700 mb-3">Add {selectedCollateral} tokens to your vault (2-step process)</p>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={`Amount of ${selectedCollateral}`}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleApprove}
                disabled={isApproving || !depositAmount}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isApproving ? 'Approving...' : '1. Approve'}
              </button>
              <button
                onClick={handleDeposit}
                disabled={isDepositing || !depositAmount}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {isDepositing ? 'Depositing...' : '2. Deposit'}
              </button>
            </div>
            
            <p className="text-xs text-green-600">
              Step 1: Click "Approve" to allow spending. Step 2: Click "Deposit" to add tokens to vault.
            </p>
          </div>
        </div>

        {/* 2. Lock/Unlock Collateral */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-3 text-blue-800">🔒 Manage Locked Collateral</h4>
          <p className="text-sm text-blue-700 mb-3">Lock deposited {selectedCollateral} to enable borrowing (step 2)</p>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Lock Section */}
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">Lock Collateral</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount to lock"
                  value={lockAmount}
                  onChange={(e) => setLockAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleLock}
                  disabled={isLocking || !lockAmount}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLocking ? 'Locking...' : 'Lock'}
                </button>
              </div>
            </div>

            {/* Unlock Section */}
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">Unlock Collateral</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount to unlock"
                  value={unlockAmount}
                  onChange={(e) => setUnlockAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleUnlock}
                  disabled={isUnlocking || !unlockAmount}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isUnlocking ? 'Unlocking...' : 'Unlock'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Mint/Repay Stablecoin */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h4 className="font-semibold mb-3 text-purple-800">💵 Manage Stablecoin</h4>
          <p className="text-sm text-purple-700 mb-3">Mint or repay USDog stablecoin against your locked collateral. Minting will now transfer USDog directly to your connected wallet.</p>
          
          {/* Authorization Button */}
          <div className="mb-4">
            <button
              onClick={handleAuthorize}
              disabled={isAuthorizing}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm"
            >
              {isAuthorizing ? 'Authorizing...' : '🔑 Authorize System (Required Once)'}
            </button>
            <p className="text-xs text-purple-600 mt-1">
              Click this once to authorize the system to manage your USDog. Required before first mint.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Mint Section */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">Mint USDog</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`Max safe: ${calculateMaxSafeMint()}`}
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleMint}
                  disabled={isMinting || !mintAmount || ink === '0'}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                >
                  {isMinting ? 'Minting...' : 'Mint'}
                </button>
              </div>
              {ink === '0' && (
                < p className="text-xs text-red-600 mt-1">
                  ⚠️ Lock collateral first before minting
                </p>
              )}
            </div>

            {/* Repay Section */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">Repay USDog</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={art !== '0' ? `Max: ${art} USDog` : "No debt to repay"}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleRepay}
                  disabled={isRepaying || !repayAmount || art === '0'}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                >
                  {isRepaying ? 'Repaying...' : 'Repay'}
                </button>
              </div>
              {art === '0' && (
                <p className="text-xs text-gray-600 mt-1">
                  ℹ️ No debt to repay
                </p>
              )}
              {art !== '0' && (
                <p className="text-xs text-purple-600 mt-1">
                  💡 Current debt: {art} USDog
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 5. Withdraw Collateral to Wallet */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h4 className="font-semibold mb-3 text-orange-800">↩️ Withdraw Collateral</h4>
          <p className="text-sm text-orange-700 mb-3">Get deposited (but unlocked) {selectedCollateral} back to your wallet</p>
          
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={`Available: ${formatBalance(collateralBalance as bigint | undefined, 18)} ${selectedCollateral}`}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleWithdrawCollateral}
              disabled={isWithdrawing || !withdrawAmount || formatBalance(collateralBalance as bigint | undefined, 18) === '0'}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </div>
          <p className="text-xs text-orange-600 mt-1">
            💡 This withdraws deposited collateral to your wallet. Use "Unlock" first if collateral is locked.
          </p>
        </div>

      </div>
    </div>
  );
};

export default CollateralSelection;