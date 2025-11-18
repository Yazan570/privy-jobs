"use client";

import { useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { Briefcase, Calendar, DollarSign, Search, User } from "lucide-react";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHEPrivyJobs } from "~~/hooks/useFHEPrivyJobs";

type Job = {
  id: number;
  title: string;
  salary: number;
  experience: string;
};

const JOBS: Job[] = [
  { id: 1, title: "Junior Frontend Developer", salary: 1000, experience: "<1 year" },
  { id: 2, title: "Frontend Developer", salary: 2000, experience: "1–3 years" },
  { id: 3, title: "Senior Frontend Developer", salary: 3500, experience: "3–5 years" },
  { id: 4, title: "Junior Backend Developer", salary: 1200, experience: "<1 year" },
  { id: 5, title: "Backend Developer", salary: 2200, experience: "1–3 years" },
  { id: 6, title: "Senior Backend Developer", salary: 4000, experience: "3–5 years" },
  { id: 7, title: "Blockchain Engineer", salary: 3000, experience: "1–5 years" },
  { id: 8, title: "Project Manager", salary: 4000, experience: "3–5 years" },
  { id: 9, title: "QA Engineer", salary: 1500, experience: "1–3 years" },
  { id: 10, title: "DevOps Engineer", salary: 3500, experience: "3–5 years" },
];

function parseMinYears(exp: string) {
  if (exp.includes("<")) return 0;
  const match = exp.match(/\d+/g);
  if (!match) return 0;
  return Number(match[0]);
}

function parseUserYears(input: string) {
  const match = input.match(/\d+/g);
  if (!match) return 0;
  return Number(match[0]);
}

export function EncryptedJob() {
  const { isConnected, chain } = useAccount();
  const chainId = chain?.id;
  const provider = typeof window !== "undefined" ? (window as any).ethereum : undefined;

  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains: {
      11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    },
    enabled: true,
  });

  const jobForm = useFHEPrivyJobs({ instance: fhevmInstance });

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [experience, setExperience] = useState("");
  const [desiredSalary, setDesiredSalary] = useState("");
  const [matchedJob, setMatchedJob] = useState<Job | null>(null);
  const [applyConfirmed, setApplyConfirmed] = useState(false);
  const [showMatchedJob, setShowMatchedJob] = useState(false);

  const handleSearchJob = () => {
    setShowMatchedJob(true);
    const salaryNum = Number(desiredSalary);
    const userYears = parseUserYears(experience);

    const job = JOBS.find(j => {
      const minYears = parseMinYears(j.experience);
      const salaryMatch = salaryNum >= j.salary && salaryNum <= j.salary * 1.5;
      const expMatch = userYears >= minYears;
      return salaryMatch && expMatch;
    });

    setMatchedJob(job ?? null);
  };

  const handleApply = async () => {
    if (!matchedJob) return;
    await jobForm.submitJob(matchedJob.id);
    setApplyConfirmed(true);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-60px)] w-full text-center px-4">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">Connect your wallet to apply 💼</h2>
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all outline-none text-gray-900 placeholder-gray-400";

  return (
    <div className="max-w-[900px] mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-400 to-pink-500">
        Encrypted Job Application
      </h1>

      <p className="text-center text-gray-600 text-lg">
        Find your best matching jobs! Enter your information below, click <strong>Search Job</strong>, and see which
        positions match your experience and desired salary.
      </p>

      <div className="flex justify-center my-4">
        <img
          src="/job-illustration.png"
          alt="Job Illustration"
          className="w-full max-w-md rounded-xl shadow-lg object-cover"
        />
      </div>

      {!applyConfirmed && !jobForm.alreadyApplied ? (
        <div className="space-y-6">
          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <User className="w-5 h-5 text-blue-500" /> Full Name
              </label>
              <input
                placeholder="Enter your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Calendar className="w-5 h-5 text-green-500" /> Age
              </label>
              <input
                placeholder="Enter your age"
                value={age}
                onChange={e => setAge(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Briefcase className="w-5 h-5 text-purple-500" /> Experience
              </label>
              <input
                placeholder="Enter your experience in years, e.g., 2"
                value={experience}
                onChange={e => setExperience(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <DollarSign className="w-5 h-5 text-yellow-500" /> Desired Salary (USD)
              </label>
              <input
                placeholder="Enter desired salary"
                value={desiredSalary}
                onChange={e => setDesiredSalary(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={handleSearchJob}
            className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-red-400 rounded-xl font-semibold text-white shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" /> Search Job
          </button>

          <p className="text-gray-500 text-sm text-center">
            Tip: Experience should be in years (e.g., 2), desired salary in USD. Matching jobs will consider ±50% salary
            range.
          </p>

          {showMatchedJob && matchedJob && (
            <div className="p-6 rounded-2xl bg-gradient-to-tr from-yellow-50 via-yellow-100 to-yellow-50 shadow-xl transform transition-all hover:scale-105 hover:shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-bold text-yellow-800">{matchedJob.title}</h3>
                <span className="px-3 py-1 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-yellow-400 to-amber-300">
                  {matchedJob.experience}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-700 font-medium">Salary: ${matchedJob.salary}</p>
              </div>
              <button
                onClick={handleApply}
                className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-300 rounded-xl font-semibold shadow-md text-gray-900 hover:scale-105 transition-transform"
              >
                Apply to this job
              </button>
            </div>
          )}

          {showMatchedJob && !matchedJob && (
            <p className="text-red-500 font-medium text-center">No matching jobs found for your input.</p>
          )}
        </div>
      ) : (
        <div className="w-113 ml-[200px] text-center p-6 border rounded-xl bg-green-50 shadow-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-green-900">Application Submitted!</h2>
          <p className="text-gray-800">Your encrypted job ID has been stored on-chain ✅</p>

          {jobForm.storedHandle && jobForm.canDecrypt && !jobForm.decodedJobId && (
            <button
              onClick={() => jobForm.decryptJob()}
              disabled={jobForm.isDecrypting}
              className="w-100 mt-4 px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-300 rounded-xl font-semibold text-gray-900 shadow-md hover:scale-105 transition-transform"
            >
              {jobForm.isDecrypting ? "Decrypting..." : "Decrypt to view job"}
            </button>
          )}

          {jobForm.decodedJobId !== 0 && (
            <p className="mt-2 text-gray-900 font-medium">
              Decrypted Job ID: <strong>{jobForm.decodedJobId}</strong> —{" "}
              <strong>{JOBS.find(j => j.id === jobForm.decodedJobId)?.title}</strong>
            </p>
          )}
        </div>
      )}

      {jobForm.statusMsg && <p className="mt-4 text-gray-500 text-center">{jobForm.statusMsg}</p>}
    </div>
  );
}
