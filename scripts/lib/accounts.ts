// Load/create testnet accounts from environment or default fixtures (W-4.2).
import fs from "node:fs";
import path from "node:path";

export interface DemoAccounts {
  networkId: "testnet" | "mainnet";
  wardContract: string;
  tokenContract: string;
  daoContract: string;
  settlor: string;
  caregiver: string;
  guardians: {
    aunt: string;
    uncle: string;
    teacher: string;
    pastor: string;
  };
  payees: {
    school: string;
    hospital: string;
  };
  children: {
    ada: string;
    tobi: string;
  };
}

export const DEFAULT_DEMO_ACCOUNTS: DemoAccounts = {
  networkId: "testnet",
  wardContract: process.env.WARD_CONTRACT || "ward.testnet",
  tokenContract: process.env.TOKEN_CONTRACT || "usdc.testnet",
  daoContract: process.env.DAO_CONTRACT || "ward-dao.sputnik-dao.near",
  settlor: process.env.SETTLOR_ACCOUNT || "parent.testnet",
  caregiver: process.env.CAREGIVER_ACCOUNT || "uncle_caregiver.testnet",
  guardians: {
    aunt: "maternal_aunt.testnet",
    uncle: "paternal_uncle.testnet",
    teacher: "teacher_institute.testnet",
    pastor: "pastor_community.testnet",
  },
  payees: {
    school: "demo_school.testnet",
    hospital: "city_hospital.testnet",
  },
  children: {
    ada: "ada.testnet",
    tobi: "tobi.testnet",
  },
};

export async function loadAccounts(): Promise<DemoAccounts> {
  // If .env or credentials exist on disk, read them
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && match[1]) {
        process.env[match[1].trim()] = match[2]?.trim() ?? "";
      }
    }
  }

  return {
    ...DEFAULT_DEMO_ACCOUNTS,
    wardContract: process.env.WARD_CONTRACT || DEFAULT_DEMO_ACCOUNTS.wardContract,
    tokenContract: process.env.TOKEN_CONTRACT || DEFAULT_DEMO_ACCOUNTS.tokenContract,
    daoContract: process.env.DAO_CONTRACT || DEFAULT_DEMO_ACCOUNTS.daoContract,
  };
}
