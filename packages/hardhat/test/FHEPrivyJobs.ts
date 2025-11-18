import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FHEPrivyJobs, FHEPrivyJobs__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Accounts = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployJobFixture() {
  const factory = (await ethers.getContractFactory("FHEPrivyJobs")) as FHEPrivyJobs__factory;
  const contract = (await factory.deploy()) as FHEPrivyJobs;
  const addr = await contract.getAddress();
  return { contract, addr };
}

describe("FHEPrivyJobs Contract - Number Data Tests", function () {
  let accounts: Accounts;
  let contract: FHEPrivyJobs;
  let addr: string;

  before(async () => {
    const signers = await ethers.getSigners();
    accounts = { owner: signers[0], alice: signers[1], bob: signers[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.log("⚠️  Tests require FHEVM mock mode");
      this.skip();
    }
    ({ contract, addr } = await deployJobFixture());
  });

  it("allows a user to submit and decrypt a job ID", async () => {
    const jobId = 42; // số trực tiếp

    const encryptedInput = await fhevm
      .createEncryptedInput(addr, accounts.alice.address)
      .add32(BigInt(jobId))
      .encrypt();

    await contract.connect(accounts.alice).submitEncryptedJob(encryptedInput.handles[0], encryptedInput.inputProof);

    const registered = await contract.isJobSubmitted(accounts.alice.address);
    expect(registered).to.eq(true);

    const stored = await contract.getEncryptedJob(accounts.alice.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored, addr, accounts.alice);

    expect(Number(decrypted)).to.eq(jobId);
  });

  it("rejects multiple submissions from the same wallet", async () => {
    const firstInput = await fhevm.createEncryptedInput(addr, accounts.alice.address).add32(BigInt(101)).encrypt();

    await contract.connect(accounts.alice).submitEncryptedJob(firstInput.handles[0], firstInput.inputProof);

    const secondInput = await fhevm.createEncryptedInput(addr, accounts.alice.address).add32(BigInt(102)).encrypt();

    await expect(
      contract.connect(accounts.alice).submitEncryptedJob(secondInput.handles[0], secondInput.inputProof),
    ).to.be.revertedWith("Job ID already submitted");
  });

  it("permits multiple users to register distinct job IDs independently", async () => {
    const aliceInput = await fhevm.createEncryptedInput(addr, accounts.alice.address).add32(BigInt(7)).encrypt();
    const bobInput = await fhevm.createEncryptedInput(addr, accounts.bob.address).add32(BigInt(9)).encrypt();

    await contract.connect(accounts.alice).submitEncryptedJob(aliceInput.handles[0], aliceInput.inputProof);
    await contract.connect(accounts.bob).submitEncryptedJob(bobInput.handles[0], bobInput.inputProof);

    const aliceStored = await contract.getEncryptedJob(accounts.alice.address);
    const bobStored = await contract.getEncryptedJob(accounts.bob.address);

    const aliceDecrypted = await fhevm.userDecryptEuint(FhevmType.euint32, aliceStored, addr, accounts.alice);
    const bobDecrypted = await fhevm.userDecryptEuint(FhevmType.euint32, bobStored, addr, accounts.bob);

    expect(Number(aliceDecrypted)).to.eq(7);
    expect(Number(bobDecrypted)).to.eq(9);
  });

  it("generates unique ciphertexts for identical job IDs from different wallets", async () => {
    const value = BigInt(55);

    const encAlice = await fhevm.createEncryptedInput(addr, accounts.alice.address).add32(value).encrypt();
    const encBob = await fhevm.createEncryptedInput(addr, accounts.bob.address).add32(value).encrypt();

    await contract.connect(accounts.alice).submitEncryptedJob(encAlice.handles[0], encAlice.inputProof);
    await contract.connect(accounts.bob).submitEncryptedJob(encBob.handles[0], encBob.inputProof);

    const resAlice = await contract.getEncryptedJob(accounts.alice.address);
    const resBob = await contract.getEncryptedJob(accounts.bob.address);

    expect(resAlice).to.not.eq(resBob);
  });

  it("returns false for addresses without submission", async () => {
    expect(await contract.isJobSubmitted(accounts.bob.address)).to.eq(false);
  });
});
