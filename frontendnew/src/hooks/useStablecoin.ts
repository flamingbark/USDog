import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACT_ADDRESSES, ILK_DOGE, ILK_SHIB, VAT_ABI, STABLECOIN_ABI } from '@/lib/contracts';
import { useState } from 'react';
import { useChainId } from 'wagmi';
import { ethers } from 'ethers';

export function useStablecoin(selectedCollateral: 'DOGE' | 'SHIB' = 'SHIB') {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = chainId === 56 ? CONTRACT_ADDRESSES.bsc : CONTRACT_ADDRESSES.bscTestnet;
  
  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
  const { isPending: isReceiptPending, isSuccess } = useWaitForTransactionReceipt({
    hash: hash
  });
  
  const [isApproving, setIsApproving] = useState(false);
  const isPending = isWritePending || (!!hash && isReceiptPending) || isApproving;

  // Read current CDP position for the selected collateral
  const currentIlk = selectedCollateral === 'DOGE' ? ILK_DOGE : ILK_SHIB;
  const { data: urnData, refetch: refetchUrn } = useReadContract({
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
    args: address ? [currentIlk as `0x${string}`, address as `0x${string}`] : undefined,
  });

  const ink = urnData?.[0] ? formatEther(urnData[0]) : '0';
  const art = urnData?.[1] ? formatEther(urnData[1]) : '0';

  // --- Preflight reads for USDog withdraws ---
  // 1) Internal dai balance (rad) in Vat for the user
  const { data: daiRadBalance } = useReadContract({
    address: addresses.vat as `0x${string}`,
    abi: [
      {
        name: 'dai',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'usr', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'dai',
    args: address ? [address as `0x${string}`] : undefined,
  });

  // 2) Permission can[user][daiJoin] == 1?
  const { data: canDaiJoin } = useReadContract({
    address: addresses.vat as `0x${string}`,
    abi: [
      {
        name: 'can',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'bit', type: 'address' }, { name: 'usr', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'can',
    args: address ? [address as `0x${string}`, addresses.daiJoin as `0x${string}`] : undefined,
  });

  // 3) DaiJoin authorized to mint USDog? wards[daiJoin] == 1 on StableCoin
  const { data: wardsDaiJoin } = useReadContract({
    address: addresses.stablecoin as `0x${string}`,
    abi: [
      {
        name: 'wards',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'wards',
    args: [addresses.daiJoin as `0x${string}`],
  });

  // Refetch data after successful transactions
  if (isSuccess) {
    setTimeout(() => {
      refetchUrn();
    }, 2000);
  }

  // Deposit collateral - returns a promise to handle approval then deposit
  const depositCollateral = (amount: string, collateralType: 'DOGE' | 'SHIB') => {
    if (!address) return Promise.reject('No address');
    
    const joinAddress = collateralType === 'DOGE' ? addresses.dogeJoin : addresses.shibJoin;
    const tokenAddress = collateralType === 'DOGE' ? addresses.dogeToken : addresses.shibToken;
    
    console.log('🎯 Deposit initiated for', collateralType);
    console.log('📋 Token:', tokenAddress);
    console.log('📋 Join:', joinAddress);
    console.log('💰 Amount:', amount);
    
    // Use exact decimals for each token - same as approval function
    const decimals = collateralType === 'DOGE' ? 8 : 18;
    const exactAmount = ethers.parseUnits(amount, decimals);
    
    console.log('📊 Deposit amount in token units:', exactAmount.toString());
    console.log('🔍 Using decimals:', decimals);
    
    // For now, just do the join directly - user should approve manually first
    return writeContract({
      address: joinAddress as `0x${string}`,
      abi: [
        {
          name: 'join',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'usr', type: 'address' }, { name: 'wad', type: 'uint256' }],
          outputs: []
        }
      ],
      functionName: 'join',
      args: [address as `0x${string}`, exactAmount],
    });
  };

  // Approve token for spending (exact amount only)
  const approveToken = (amount: string, collateralType: 'DOGE' | 'SHIB') => {
    if (!address) return Promise.reject('No address');
    
    const joinAddress = collateralType === 'DOGE' ? addresses.dogeJoin : addresses.shibJoin;
    const tokenAddress = collateralType === 'DOGE' ? addresses.dogeToken : addresses.shibToken;
    
    console.log('🔓 Approving exact amount:', amount, collateralType);
    console.log('📋 Token address:', tokenAddress);
    console.log('📋 Spender (join):', joinAddress);
    
    // Use exact decimals for each token - approve exact amount requested
    const decimals = collateralType === 'DOGE' ? 8 : 18;
    const exactAmount = ethers.parseUnits(amount, decimals);
    
    console.log('💰 Approving exactly:', amount, collateralType);
    console.log('📊 In wei:', exactAmount.toString());
    
    return writeContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
          outputs: [{ name: '', type: 'bool' }]
        }
      ],
      functionName: 'approve',
      args: [joinAddress as `0x${string}`, exactAmount],
    });
  };

  // Authorize DaiJoin contract to manage USDog in Vat (required for minting)
  const authorizeVat = () => {
    if (!address) return Promise.reject('No address');
    
    console.log('🔑 Authorizing DaiJoin to manage USDog in Vat...');
    console.log('📋 DaiJoin address:', addresses.daiJoin);
    
    return writeContract({
      address: addresses.vat as `0x${string}`,
      abi: [
        {
          name: 'hope',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'usr', type: 'address' }],
          outputs: []
        }
      ],
      functionName: 'hope',
      args: [addresses.daiJoin as `0x${string}`],
    });
  };

  // Lock collateral in CDP
  const lockCollateral = async (amount: string, ilk: string) => {
    if (!address) return;
    
    await writeContract({
      address: addresses.vat as `0x${string}`,
      abi: [
        {
          name: 'frob',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'i', type: 'bytes32' },
            { name: 'u', type: 'address' },
            { name: 'v', type: 'address' },
            { name: 'w', type: 'address' },
            { name: 'dink', type: 'int256' },
            { name: 'dart', type: 'int256' }
          ],
          outputs: []
        }
      ],
      functionName: 'frob',
      args: [ilk as `0x${string}`, address as `0x${string}`, address as `0x${string}`, address as `0x${string}`, parseEther(amount), BigInt(0)],
    });
  };

  // Generate (mint) USDog - ONLY mints debt in Vat (no auto-withdrawal)
  const generateStablecoin = async (amount: string, ilk: string) => {
    if (!address) return;
    
    console.log('🏦 Minting USDog debt in Vat...');
    console.log('📊 Amount:', amount, 'USDog');
    console.log('🔑 ILK:', ilk);
    
    // Only mint USDog debt in Vat - user can manually withdraw later if needed
    return writeContract({
      address: addresses.vat as `0x${string}`,
      abi: [
        {
          name: 'frob',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'i', type: 'bytes32' },
            { name: 'u', type: 'address' },
            { name: 'v', type: 'address' },
            { name: 'w', type: 'address' },
            { name: 'dink', type: 'int256' },
            { name: 'dart', type: 'int256' }
          ],
          outputs: []
        }
      ],
      functionName: 'frob',
      args: [ilk as `0x${string}`, address as `0x${string}`, address as `0x${string}`, address as `0x${string}`, BigInt(0), parseEther(amount)],
    });
  };

  // Generate and immediately send USDog to a recipient (e.g. minter wallet)
  // This performs: frob (mint internal) -> bounded wait -> ensure hope -> DaiJoin.exit(recipient)
  const generateAndSendStablecoin = async (amount: string, ilk: string, recipient: string) => {
    if (!address) return;

    const amountWad = parseEther(amount);

    // Helper: bounded delay to avoid WalletConnect receipt hangs without RPC waits
    const waitOrTimeout = async (_hash: `0x${string}` | string, ms: number) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    };

    // 1) Generate internal USDog in Vat for the connected wallet (msg.sender)
    const frobHash = await writeContract({
      address: addresses.vat as `0x${string}`,
      abi: [
        {
          name: 'frob',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'i', type: 'bytes32' },
            { name: 'u', type: 'address' },
            { name: 'v', type: 'address' },
            { name: 'w', type: 'address' },
            { name: 'dink', type: 'int256' },
            { name: 'dart', type: 'int256' }
          ],
          outputs: []
        }
      ],
      functionName: 'frob',
      args: [ilk as `0x${string}`, address as `0x${string}`, address as `0x${string}`, address as `0x${string}`, BigInt(0), amountWad],
    });

    // Bounded wait for confirmation (prevents stuck "Minting" state)
    await waitOrTimeout(frobHash as any, 15000);

    // 2) Ensure DaiJoin permission (Vat.can(user, DaiJoin) == 1)
    let can = BigInt((canDaiJoin as any)?.toString() ?? '0');
    if (can === BigInt(0)) {
      // Submit hope tx and bounded wait to avoid race in vat.move
      const hopeHash = await writeContract({
        address: addresses.vat as `0x${string}`,
        abi: [
          {
            name: 'hope',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'usr', type: 'address' }],
            outputs: []
          }
        ],
        functionName: 'hope',
        args: [addresses.daiJoin as `0x${string}`],
      });

      await waitOrTimeout(hopeHash as any, 10000);
      console.log('✅ Granted Vat.can(user, DaiJoin) for generate-and-send');
      // Best-effort refresh of local can flag
      can = BigInt(1);
    } else {
      console.log('ℹ️ Vat.can(user, DaiJoin) already set');
    }

    // 3) Exit directly to the recipient (mints USDog to recipient)
    await writeContract({
      address: addresses.daiJoin as `0x${string}`,
      abi: [
        {
          name: 'exit',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'usr', type: 'address' }, { name: 'wad', type: 'uint256' }],
          outputs: []
        }
      ],
      functionName: 'exit',
      args: [recipient as `0x${string}`, amountWad],
    });
  };

  // Withdraw USDog
  const withdrawStablecoin = async (amount: string) => {
    if (!address) return;

    const amountWad = parseEther(amount);
    const RAD_BI = BigInt(10) ** BigInt(27);
    const radToWad = (rad: bigint) => rad / RAD_BI;

    // Resolve preflight values
    const daiRad = BigInt((daiRadBalance as any)?.toString() ?? '0');
    const daiWad = radToWad(daiRad);
    const can = BigInt((canDaiJoin as any)?.toString() ?? '0');
    const wards = BigInt((wardsDaiJoin as any)?.toString() ?? '0');

    console.log('[Withdraw Preflight]');
    console.log('- daiRad(user):', daiRad.toString());
    console.log('- daiWad(user):', daiWad.toString());
    console.log('- amountWad:', amountWad.toString());
    console.log('- can[user][daiJoin]:', can.toString());
    console.log('- wards[daiJoin] on StableCoin:', wards.toString());

    // Check sufficient internal USDog in Vat
    if (daiWad < amountWad) {
      throw new Error('Insufficient internal USDog balance in Vat. Mint (generate) more before withdrawing.');
    }

    // Ensure DaiJoin is authorized to mint USDog
    if (wards !== BigInt(1)) {
      throw new Error('DaiJoin is not authorized to mint USDog. Governance must call StableCoin.rely(DaiJoin).');
    }

    // Ensure DaiJoin is approved to move your Vat dai balance (set once)
    if (can === BigInt(0)) {
      await writeContract({
        address: addresses.vat as `0x${string}`,
        abi: [
          {
            name: 'hope',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'usr', type: 'address' }],
            outputs: []
          }
        ],
        functionName: 'hope',
        args: [addresses.daiJoin as `0x${string}`],
      });
      console.log('✅ Granted Vat.can(user, DaiJoin) = 1');
    } else {
      console.log('ℹ️ Vat.can(user, DaiJoin) already granted');
    }

    // Call DaiJoin.exit which will internally move rad and mint USDog
    await writeContract({
      address: addresses.daiJoin as `0x${string}`,
      abi: [
        {
          name: 'exit',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'usr', type: 'address' }, { name: 'wad', type: 'uint256' }],
          outputs: []
        }
      ],
      functionName: 'exit',
      args: [address as `0x${string}`, amountWad],
    });
  };

  // Repay USDog - robust path that derives safe repay from actual internal dai to avoid under/overflow
  const repayStablecoin = async (amount: string, ilk: string) => {
    if (!address) return Promise.reject('No address');

    console.log('🔄 Repaying debt (join USDog then frob dart<0)...');
    console.log('Requested repay (wad):', amount);
    console.log('UI-reported current debt (art):', art);

    // Helper: bounded delay
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // On-chain reads
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const vat = new ethers.Contract(addresses.vat as string, VAT_ABI as any, provider);

    const urn = await vat.urns(ilk, address);
    let artWad = BigInt(urn[1].toString()); // current debt [wad]
    const ilkData = await vat.ilks(ilk);
    const rateRay = BigInt(ilkData[1].toString()); // [ray]
    const dustRad = BigInt(ilkData[4].toString()); // [rad]
    const RAY = 10n ** 27n;

    // Normalize target repay
    let targetRepayWad = parseEther(amount);
    if (targetRepayWad > artWad) {
      console.log(`Adjust targetRepayWad down from ${targetRepayWad.toString()} to outstanding art ${artWad.toString()}`);
      targetRepayWad = artWad;
    }

    // Dust rule: if resulting debt > 0, resulting tab must be >= dust; otherwise repay full to zero
    // tabAfter(rad) = rate * (art - targetRepayWad)
    let tabAfter = rateRay * (artWad - targetRepayWad);
    if (artWad - targetRepayWad > 0n && dustRad > 0n && tabAfter < dustRad) {
      console.log('Repay would leave dusty debt; switching to full repayment.');
      targetRepayWad = artWad;
    }

    // Compute join amount with headroom
    let joinWad = (targetRepayWad * rateRay + (RAY - 1n)) / RAY; // ceil(rate*repay / RAY)
    // Add small buffer to handle rate drift/rounding
    joinWad += 10n; // +10 wei buffer

    console.log('Target repayWad:', targetRepayWad.toString());
    console.log('Planned joinWad (buffered):', joinWad.toString());

    // 1) Approve USDog spending to DaiJoin
    try {
      console.log('🔑 Approving USDog -> DaiJoin for repay...');
      await writeContract({
        address: addresses.stablecoin as `0x${string}`,
        abi: [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'approve',
        args: [addresses.daiJoin as `0x${string}`, joinWad],
      });
      console.log('✅ Approved (or already sufficient)');
    } catch (e) {
      console.log('ℹ️ Approve step skipped or not required:', (e as any)?.message || e);
    }

    // 2) DaiJoin.join to convert wallet USDog -> internal dai
    console.log('🏦 DaiJoin.join (convert wallet USDog -> internal dai)...');
    await writeContract({
      address: addresses.daiJoin as `0x${string}`,
      abi: [
        {
          name: 'join',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'usr', type: 'address' }, { name: 'wad', type: 'uint256' }],
          outputs: []
        }
      ],
      functionName: 'join',
      args: [address as `0x${string}`, joinWad],
    });

    // 2b) Wait until internal dai reflects the join (poll a few times)
    let daiRad = 0n;
    for (let i = 0; i < 8; i++) {
      const dai = await vat.dai(address);
      daiRad = BigInt(dai.toString());
      if (daiRad > 0n) break;
      await sleep(1000);
    }
    console.log('Internal dai (rad) after join:', daiRad.toString());

    // Compute max repay allowed by internal dai and outstanding art
    const maxByDaiArtWad = daiRad / rateRay; // floor(dai / rate)
    let repayWad = targetRepayWad;
    if (repayWad > artWad) repayWad = artWad;
    if (repayWad > maxByDaiArtWad) {
      console.log(`Adjust repayWad down to available internal dai bound: ${maxByDaiArtWad.toString()}`);
      repayWad = maxByDaiArtWad;
    }
    if (repayWad <= 0n) {
      throw new Error('Insufficient internal USDog (dai) to repay. Increase amount joined or reduce repay amount.');
    }

    // Re-check dust rule with the final repay
    tabAfter = rateRay * (artWad - repayWad);
    if (artWad - repayWad > 0n && dustRad > 0n && tabAfter < dustRad) {
      console.log('Final repay would leave dusty debt; switching to full repayment of outstanding art.');
      repayWad = artWad;
    }

    const negativeDart = -repayWad;
    console.log('Final repayWad for frob:', repayWad.toString());

    // 3) Reduce vault debt by calling frob with negative dart
    console.log('🧮 vat.frob (dart < 0 to reduce debt)...');
    await writeContract({
      address: addresses.vat as `0x${string}`,
      abi: [
        {
          name: 'frob',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'i', type: 'bytes32' },
            { name: 'u', type: 'address' },
            { name: 'v', type: 'address' },
            { name: 'w', type: 'address' },
            { name: 'dink', type: 'int256' },
            { name: 'dart', type: 'int256' }
          ],
          outputs: []
        }
      ],
      functionName: 'frob',
      args: [ilk as `0x${string}`, address as `0x${string}`, address as `0x${string}`, address as `0x${string}`, 0n, negativeDart],
    });

    console.log('✅ Repay completed');
  };

  // Withdraw collateral - use join exit to get tokens back to wallet
  const withdrawCollateral = (amount: string, collateralType: 'DOGE' | 'SHIB') => {
    if (!address) return Promise.reject('No address');
    
    const joinAddress = collateralType === 'DOGE' ? addresses.dogeJoin : addresses.shibJoin;
    
    console.log('💸 Withdrawing collateral via join exit...');
    console.log('Amount to withdraw:', amount);
    console.log('Join address:', joinAddress);
    
    // Use exact decimals for each token - same as approval and deposit functions
    const decimals = collateralType === 'DOGE' ? 8 : 18;
    const exactAmount = ethers.parseUnits(amount, decimals);
    
    console.log('📊 Withdraw amount in token units:', exactAmount.toString());
    console.log('🔍 Using decimals:', decimals);
    
    return writeContract({
      address: joinAddress as `0x${string}`,
      abi: [
        {
          name: 'exit',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'usr', type: 'address' }, { name: 'wad', type: 'uint256' }],
          outputs: []
        }
      ],
      functionName: 'exit',
      args: [address as `0x${string}`, exactAmount],
    });
  };

  // Unlock collateral with safety precheck to avoid Vat/not-safe
  const unlockCollateral = async (amount: string, ilk: string) => {
    if (!address) return Promise.reject('No address');

    console.log('🔓 Unlocking collateral via frob with safety precheck...');
    console.log('Requested unlock:', amount);

    // Read fresh urn/ilk values
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const vat = new ethers.Contract(addresses.vat as string, VAT_ABI as any, provider);

    const urn = await vat.urns(ilk, address);
    const inkWad = BigInt(urn[0].toString());
    const artWad = BigInt(urn[1].toString());

    const ilkData = await vat.ilks(ilk);
    const rateRay = BigInt(ilkData[1].toString());
    const spotRay = BigInt(ilkData[2].toString());

    // Compute max safe unlock:
    // Keep: rate * art <= (ink - unlock) * spot
    // minInkRequired = ceil(rate*art / spot); maxUnlock = max(0, ink - minInkRequired)
    let maxUnlockWad: bigint;
    if (artWad === 0n || rateRay === 0n || spotRay === 0n) {
      maxUnlockWad = inkWad;
    } else {
      const minInkRequired = (rateRay * artWad + (spotRay - 1n)) / spotRay; // ceil
      maxUnlockWad = inkWad > minInkRequired ? (inkWad - minInkRequired) : 0n;
    }
    // 0.5% buffer
    maxUnlockWad = (maxUnlockWad * 995n) / 1000n;

    const reqUnlockWad = parseEther(amount);
    if (reqUnlockWad > maxUnlockWad) {
      const humanMax = formatEther(maxUnlockWad);
      return Promise.reject(new Error(`Unlock would make vault unsafe (Vat/not-safe). Max safe unlock: ${humanMax}`));
    }

    const negativeAmount = -reqUnlockWad;

    return writeContract({
      address: addresses.vat as `0x${string}`,
      abi: [
        {
          name: 'frob',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'i', type: 'bytes32' },
            { name: 'u', type: 'address' },
            { name: 'v', type: 'address' },
            { name: 'w', type: 'address' },
            { name: 'dink', type: 'int256' },
            { name: 'dart', type: 'int256' }
          ],
          outputs: []
        }
      ],
      functionName: 'frob',
      args: [ilk as `0x${string}`, address as `0x${string}`, address as `0x${string}`, address as `0x${string}`, negativeAmount, BigInt(0)],
    });
  };

  // Close vault (repay all debt and withdraw all collateral)
  const closeVault = async (ilk: string) => {
    // This would combine repay and withdraw - simplified
    await repayStablecoin(art, ilk);
    await withdrawCollateral(ink, selectedCollateral);
  };

  return {
    ink,
    art,
    depositCollateral,
    approveToken,
    authorizeVat,
    lockCollateral,
    unlockCollateral,
    generateStablecoin,
    generateAndSendStablecoin,
    withdrawStablecoin,
    repayStablecoin,
    withdrawCollateral,
    closeVault,
    isPending,
    isSuccess,
    refetchData: refetchUrn
  };
}