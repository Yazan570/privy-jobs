"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import {
  FhevmInstance,
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import { useReadContract } from "wagmi";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";

/**
 * @hook useFHEPrivyJobs
 * @description Provides encrypted job ID submission + decryption utilities
 */
export const useFHEPrivyJobs = ({
  instance,
  initialMockChains,
}: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { storage: signatureStorage } = useInMemoryStorage();

  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  const typedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;

  const { data: contractMeta } = useDeployedContractInfo({
    contractName: "FHEPrivyJobs",
    chainId: typedChainId,
  });

  type JobContract = Contract<"FHEPrivyJobs"> & { chainId?: number };

  const [statusMsg, setStatusMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const contractAvailable = Boolean(contractMeta?.address && contractMeta?.abi);

  /** Build contract instance */
  const getContract = (mode: "read" | "write") => {
    if (!contractAvailable) return undefined;
    const provider = mode === "read" ? ethersReadonlyProvider : (ethersSigner ?? undefined);
    if (!provider) return undefined;

    return new ethers.Contract(contractMeta!.address, (contractMeta as JobContract).abi, provider);
  };

  /** Query encrypted job ID */
  const { data: encryptedJobHandle, refetch: reloadJob } = useReadContract({
    address: contractMeta?.address as `0x${string}` | undefined,
    abi: (contractMeta as JobContract)?.abi as any,
    functionName: "getEncryptedJob",
    args: [accounts?.[0] ?? ""],
    query: {
      enabled: !!(contractAvailable && ethersReadonlyProvider),
      refetchOnWindowFocus: false,
    },
  });

  const storedHandle = useMemo(() => (encryptedJobHandle as string) ?? undefined, [encryptedJobHandle]);

  const alreadyApplied = useMemo(() => {
    return storedHandle && storedHandle !== ethers.ZeroHash && storedHandle !== "0x" && storedHandle !== "0x0";
  }, [storedHandle]);

  /** Prepare decrypt request */
  const decryptRequests = useMemo(() => {
    if (!storedHandle || !contractAvailable) return undefined;
    return [
      {
        handle: storedHandle,
        contractAddress: contractMeta!.address,
      },
    ] as const;
  }, [storedHandle, contractAvailable, contractMeta?.address]);

  /** FHE decrypt */
  const {
    decrypt,
    results,
    canDecrypt,
    isDecrypting,
    message: decryptInfo,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage: signatureStorage,
    chainId,
    requests: decryptRequests,
  });

  const [decryptedJobId, setDecryptedJobId] = useState<number>(0);

  useEffect(() => {
    if (!results || Object.keys(results).length === 0) return;

    const handle = Object.keys(results)[0];
    const decrypted = results[handle];

    if (typeof decrypted === "bigint") {
      setDecryptedJobId(Number(decrypted)); // convert bigint → number
    }
  }, [results]);

  useEffect(() => {
    if (decryptInfo) setStatusMsg(decryptInfo);
  }, [decryptInfo]);

  /** FHE encryption */
  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: contractMeta?.address,
  });

  const detectEncryptionMethod = () => {
    const fn = contractMeta?.abi.find(it => it.type === "function" && it.name === "submitEncryptedJob");
    if (!fn) return { method: undefined, error: "Missing ABI entry" };

    const firstArg = fn.inputs?.[0];
    return { method: getEncryptionMethod(firstArg?.internalType) };
  };

  /** Submit job ID */
  const pushEncryptedJob = useCallback(
    async (jobId: number) => {
      if (busy) return;

      setBusy(true);
      setStatusMsg(`Encrypting job ID ${jobId}...`);

      try {
        const { method, error } = detectEncryptionMethod();
        if (!method) return setStatusMsg(error ?? "Encryption method missing");

        const encrypted = await encryptWith(builder => (builder as any)[method](jobId));
        if (!encrypted) return setStatusMsg("Encryption failed");

        const writer = getContract("write");
        if (!writer) return setStatusMsg("No contract signer available");

        const params = buildParamsFromAbi(encrypted, [...contractMeta!.abi] as any[], "submitEncryptedJob");

        const tx = await writer.submitEncryptedJob(...params, {
          gasLimit: 400_000,
        });
        await tx.wait();

        await reloadJob();
        setStatusMsg("✔ Job ID encrypted & stored successfully");
      } catch (err) {
        setStatusMsg(`❌ ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setBusy(false);
      }
    },
    [busy, encryptWith, getContract, contractMeta?.abi],
  );

  return {
    submitJob: pushEncryptedJob,
    decryptJob: decrypt,
    storedHandle,
    alreadyApplied,
    canDecrypt,
    isDecrypting,
    isConnected,
    accounts,
    chainId,
    statusMsg,
    busy,
    contractAvailable,
    decodedJobId: decryptedJobId,
  };
};
