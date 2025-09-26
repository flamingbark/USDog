import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther, encodeFunctionData } from "viem";
import {
  CONTRACT_ADDRESSES,
  POT_ABI,
  STABLECOIN_ABI,
  DAI_JOIN_ABI,
  VAT_ABI,
  MULTICALL_ABI,
} from "@/lib/contracts";
import { useState } from "react";
import { useChainId } from "wagmi";

export function usePot() {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses =
    chainId === 56 ? CONTRACT_ADDRESSES.bsc : CONTRACT_ADDRESSES.bscTestnet;

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
  } = useWriteContract();
  const { isPending: isReceiptPending, isSuccess } =
    useWaitForTransactionReceipt({
      hash: hash,
    });

  const [isApproving, setIsApproving] = useState(false);
  const isPending =
    isWritePending || (!!hash && isReceiptPending) || isApproving;

  // Read user's pie (normalized savings balance)
  const { data: userPie, refetch: refetchPie } = useReadContract({
    address: addresses.pot as `0x${string}`,
    abi: POT_ABI,
    functionName: "pie",
    args: address ? [address as `0x${string}`] : undefined,
  });

  // Read current chi (rate accumulator)
  const { data: chi, refetch: refetchChi } = useReadContract({
    address: addresses.pot as `0x${string}`,
    abi: POT_ABI,
    functionName: "chi",
  });

  // Read current dsr (savings rate)
  const { data: dsr, refetch: refetchDsr } = useReadContract({
    address: addresses.pot as `0x${string}`,
    abi: POT_ABI,
    functionName: "dsr",
  });

  // Read total Pie (total normalized savings)
  const { data: totalPie, refetch: refetchTotalPie } = useReadContract({
    address: addresses.pot as `0x${string}`,
    abi: POT_ABI,
    functionName: "Pie",
  });

  // Read user's wallet USDog balance
  const { data: walletBalance, refetch: refetchWalletBalance } =
    useReadContract({
      address: addresses.stablecoin as `0x${string}`,
      abi: STABLECOIN_ABI,
      functionName: "balanceOf",
      args: address ? [address as `0x${string}`] : undefined,
    });

  // Calculate user's actual balance: pie * chi / RAY
  const userBalance =
    userPie && chi
      ? formatEther(
          (BigInt(userPie.toString()) * BigInt(chi.toString())) /
            BigInt(10 ** 27),
        )
      : "0";

  // Calculate savings rate as annual percentage
  const savingsRate = dsr
    ? ((Number(dsr.toString()) / Number(10 ** 27) - 1) * 100).toFixed(2)
    : "0";

  // Individual deposit step functions
  const updateRates = async () => {
    console.log("💧 Updating interest rates...");
    return writeContract({
      address: addresses.pot as `0x${string}`,
      abi: POT_ABI,
      functionName: "drip",
      args: [],
    });
  };

  const approveDaiJoin = async (amount: string) => {
    console.log("🔓 Approving DaiJoin to spend tokens...");
    const wad = parseEther(amount);
    setIsApproving(true);
    try {
      const result = await writeContract({
        address: addresses.stablecoin as `0x${string}`,
        abi: STABLECOIN_ABI,
        functionName: "approve",
        args: [addresses.daiJoin as `0x${string}`, wad],
      });
      console.log("✅ Approval completed");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch wallet balance after approval
      refetchWalletBalance();
      return result;
    } finally {
      setIsApproving(false);
    }
  };

  const joinStablecoinToVat = async (amount: string) => {
    console.log("🏦 Joining stablecoin into Vat...");
    const wad = parseEther(amount);
    const result = await writeContract({
      address: addresses.daiJoin as `0x${string}`,
      abi: DAI_JOIN_ABI,
      functionName: "join",
      args: [address as `0x${string}`, wad],
    });
    console.log("✅ DaiJoin completed");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Refetch wallet balance after joining to Vat
    refetchWalletBalance();
    return result;
  };

  const authorizePot = async () => {
    console.log("🔑 Authorizing Pot contract...");
    const result = await writeContract({
      address: addresses.vat as `0x${string}`,
      abi: VAT_ABI,
      functionName: "hope",
      args: [addresses.pot as `0x${string}`],
    });
    console.log("✅ Authorization completed");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return result;
  };

  const depositToPot = async (amount: string) => {
    console.log("💰 Depositing into Pot savings...");

    const wad = parseEther(amount);

    return writeContract({
      address: addresses.pot as `0x${string}`,
      abi: POT_ABI,
      functionName: "join",
      args: [wad],
    });
  };

  // Deposit USDog to savings (join)
  const depositSavings = async (amount: string) => {
    if (!address) return Promise.reject("No address");

    console.log("💰 Starting deposit process for:", amount, "USDog");

    const wad = parseEther(amount);

    // Step 1: Call drip first to update rates (required before join)
    console.log("💧 Step 1: Updating interest rates...");
    try {
      await writeContract({
        address: addresses.pot as `0x${string}`,
        abi: POT_ABI,
        functionName: "drip",
        args: [],
      });
      console.log("✅ Drip completed");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("❌ Drip failed:", error);
      throw error;
    }

    // Step 2: Approve DaiJoin to spend user's stablecoin tokens
    console.log("🔓 Step 2: Approving DaiJoin...");
    setIsApproving(true);
    try {
      await writeContract({
        address: addresses.stablecoin as `0x${string}`,
        abi: STABLECOIN_ABI,
        functionName: "approve",
        args: [addresses.daiJoin as `0x${string}`, wad],
      });
      console.log("✅ Approval completed");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("❌ Approval failed:", error);
      setIsApproving(false);
      throw error;
    }
    setIsApproving(false);

    // Step 3: Join stablecoin into Vat via DaiJoin
    console.log("🏦 Step 3: Joining stablecoin into Vat...");
    try {
      await writeContract({
        address: addresses.daiJoin as `0x${string}`,
        abi: DAI_JOIN_ABI,
        functionName: "join",
        args: [address as `0x${string}`, wad],
      });
      console.log("✅ DaiJoin completed");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("❌ DaiJoin failed:", error);
      throw error;
    }

    // Step 4: Authorize Pot contract to move user's dai
    console.log("🔑 Step 4: Authorizing Pot contract...");
    try {
      await writeContract({
        address: addresses.vat as `0x${string}`,
        abi: VAT_ABI,
        functionName: "hope",
        args: [addresses.pot as `0x${string}`],
      });
      console.log("✅ Authorization completed");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("❌ Authorization failed:", error);
      throw error;
    }

    // Step 5: Deposit into Pot
    console.log("💰 Step 5: Depositing into Pot savings...");
    const result = await writeContract({
      address: addresses.pot as `0x${string}`,
      abi: POT_ABI,
      functionName: "join",
      args: [wad],
    });
    console.log("✅ Deposit completed");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Refetch all balances after deposit
    refetchPie();
    refetchChi();
    refetchWalletBalance();
    return result;
  };

  // Withdraw USDog from savings (exit)
  const withdrawSavings = async (amount: string) => {
    if (!address) return Promise.reject("No address");

    console.log("💸 Starting withdrawal process for:", amount, "USDog");

    const wad = parseEther(amount);

    // Validate available balance before attempting withdrawal
    const availableBalance = parseFloat(userBalance);
    const requestedAmount = parseFloat(amount);

    console.log("Withdrawal validation:", {
      userBalance,
      amount,
      availableBalance,
      requestedAmount,
      comparison: requestedAmount > availableBalance,
      isEqual: requestedAmount === availableBalance,
      availableFormatted: availableBalance.toFixed(6),
      requestedFormatted: requestedAmount.toFixed(6),
    });

    // Allow small floating point differences (within 0.000001)
    const tolerance = 0.000001;
    if (requestedAmount > availableBalance + tolerance) {
      throw new Error(
        `Insufficient balance. Available: ${availableBalance.toFixed(4)} USDog, Requested: ${amount} USDog`,
      );
    }

    // Step 1: Call pot.exit() to move dai from Pot to user in Vat
    console.log("🏦 Step 1: Exiting from Pot...");
    try {
      await writeContract({
        address: addresses.pot as `0x${string}`,
        abi: POT_ABI,
        functionName: "exit",
        args: [wad],
      });
      console.log("✅ Pot exit completed");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("❌ Pot exit failed:", error);
      throw error;
    }

    // Step 2: Call daiJoin.exit() to convert dai to tokens
    console.log("💰 Step 2: Converting dai to tokens...");
    const result = await writeContract({
      address: addresses.daiJoin as `0x${string}`,
      abi: DAI_JOIN_ABI,
      functionName: "exit",
      args: [address as `0x${string}`, wad],
    });
    console.log("✅ Withdrawal completed");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Refetch balances after withdrawal
    refetchPie();
    refetchChi();
    refetchWalletBalance();
    return result;
  };

  // Helper function to call drip before operations
  const ensureDrip = async () => {
    console.log("💧 Calling drip to update interest accrual...");
    await writeContract({
      address: addresses.pot as `0x${string}`,
      abi: POT_ABI,
      functionName: "drip",
      args: [],
    });
    console.log("✅ Drip completed");
    // Small delay to ensure transaction is processed
    await new Promise((resolve) => setTimeout(resolve, 2000));
  };

  // Drip function to update interest accrual
  const drip = () => {
    console.log("💧 Dripping interest...");

    return writeContract({
      address: addresses.pot as `0x${string}`,
      abi: POT_ABI,
      functionName: "drip",
      args: [],
    });
  };

  // Refetch all data after successful transactions
  if (isSuccess) {
    setTimeout(() => {
      refetchPie();
      refetchChi();
      refetchDsr();
      refetchTotalPie();
      refetchWalletBalance();
    }, 2000);
  }

  return {
    userBalance, // Savings balance (pie * chi)
    walletBalance: walletBalance
      ? formatEther(BigInt(walletBalance.toString()))
      : "0", // Wallet USDog balance
    savingsRate,
    totalPie: totalPie ? formatEther(BigInt(totalPie.toString())) : "0",
    // Individual step functions
    updateRates,
    approveDaiJoin,
    joinStablecoinToVat,
    authorizePot,
    depositToPot,
    // Combined function
    depositSavings,
    withdrawSavings,
    drip,
    isPending,
    isSuccess,
    refetchData: () => {
      refetchPie();
      refetchChi();
      refetchDsr();
      refetchTotalPie();
      refetchWalletBalance();
    },
  };
}
