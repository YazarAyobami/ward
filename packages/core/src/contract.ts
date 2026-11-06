// The ONLY place that knows ward method names and argument shapes (W-6.3).
import { z } from "zod";
import {
  ChildInput,
  ChildStatus,
  Circle,
  CryptoHash,
  Guardian,
  Payee,
  Request,
  RequestKind,
  Rules,
  Trust,
  U128,
} from "./types.js";

export interface ViewClient {
  getTrust(id: number): Promise<Trust | null>;
  getTrustsFor(account: string): Promise<Trust[]>;
  getRequests(trustId: number, fromIndex?: number, limit?: number): Promise<Request[]>;
  getChildStatus(trustId: number, childIdx: number): Promise<ChildStatus>;
  getAllowanceDue(trustId: number): Promise<string>;
}

export interface FunctionCall {
  contractId?: string;
  methodName: string;
  args: Record<string, unknown>;
  gas: bigint;
  deposit: bigint;
}

export const TGAS = 1_000_000_000_000n;
export const ONE_YOCTO = 1n;
export const ONE_NEAR = 1_000_000_000_000_000_000_000_000n;

/**
 * Creates an RPC view client that calls view functions on NEAR via JSON-RPC.
 */
export function createViewClient(
  rpcUrl: string,
  contractId: string,
  customFetch: typeof fetch = fetch
): ViewClient {
  async function callView(methodName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64");
    const res = await customFetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: contractId,
          method_name: methodName,
          args_base64: argsBase64,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`RPC HTTP error ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as {
      result?: { result?: number[]; error?: string };
      error?: { message?: string; data?: unknown };
    };

    if (json.error) {
      throw new Error(`RPC error: ${json.error.message ?? JSON.stringify(json.error)}`);
    }

    if (!json.result?.result) {
      throw new Error(`Missing result in RPC response: ${JSON.stringify(json)}`);
    }

    const rawStr = Buffer.from(json.result.result).toString("utf8");
    return JSON.parse(rawStr);
  }

  return {
    async getTrust(id: number): Promise<Trust | null> {
      const raw = await callView("get_trust", { trust_id: id });
      return Trust.nullable().parse(raw);
    },

    async getTrustsFor(account: string): Promise<Trust[]> {
      const raw = await callView("get_trusts_for", { account });
      return z.array(Trust).parse(raw);
    },

    async getRequests(trustId: number, fromIndex = 0, limit = 50): Promise<Request[]> {
      const raw = await callView("get_requests", {
        trust_id: trustId,
        from_index: fromIndex,
        limit,
      });
      return z.array(Request).parse(raw);
    },

    async getChildStatus(trustId: number, childIdx: number): Promise<ChildStatus> {
      const raw = await callView("get_child_status", {
        trust_id: trustId,
        child_idx: childIdx,
      });
      return ChildStatus.parse(raw);
    },

    async getAllowanceDue(trustId: number): Promise<string> {
      const raw = await callView("get_allowance_due", { trust_id: trustId });
      return U128.parse(raw);
    },
  };
}

export interface CreateTrustParams {
  label: string;
  caregiver: string;
  caregiver_circle: Circle;
  guardians: Guardian[];
  children: ChildInput[];
  payees: Payee[];
  rules: Rules;
  token: string;
}

export interface AddChildParams {
  trust_id: number;
  child: ChildInput;
}

export interface SetDaoParams {
  trust_id: number;
  dao: string;
}

export interface WithdrawParams {
  trust_id: number;
  amount: string;
}

export interface ExecuteWithdrawalParams {
  trust_id: number;
}

export interface CancelDeathClaimParams {
  trust_id: number;
}

export interface DepositParams {
  trust_id: number;
  amount: string;
  token: string;
  wardContract: string;
}

export interface AttestDeathParams {
  trust_id: number;
  evidence_hash: number[];
}

export interface ApproveParams {
  request_id: number;
}

export interface RejectParams {
  request_id: number;
}

export interface VetoWithdrawalParams {
  trust_id: number;
}

export interface PauseParams {
  trust_id: number;
}

export interface FinalizeActivationParams {
  trust_id: number;
}

export interface ClaimAllowanceParams {
  trust_id: number;
}

export interface CreateRequestParams {
  trust_id: number;
  kind: RequestKind;
  reason: string;
  receipt_hash?: number[] | null;
}

export interface FlagParams {
  request_id: number;
  child_idx: number;
}

export interface ClaimGraduationParams {
  trust_id: number;
  child_idx: number;
}

/**
 * Typed call builders for all ward smart contract interactions (W-6.3).
 */
export const calls = {
  // Settlor calls
  createTrust(params: CreateTrustParams): FunctionCall {
    return {
      methodName: "create_trust",
      args: {
        label: params.label,
        caregiver: params.caregiver,
        caregiver_circle: params.caregiver_circle,
        guardians: params.guardians,
        children: params.children,
        payees: params.payees,
        rules: params.rules,
        token: params.token,
      },
      gas: 150n * TGAS,
      deposit: ONE_NEAR,
    };
  },

  addChild(params: AddChildParams): FunctionCall {
    return {
      methodName: "add_child",
      args: {
        trust_id: params.trust_id,
        child: params.child,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  setDao(params: SetDaoParams): FunctionCall {
    return {
      methodName: "set_dao",
      args: {
        trust_id: params.trust_id,
        dao: params.dao,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  withdraw(params: WithdrawParams): FunctionCall {
    return {
      methodName: "withdraw",
      args: {
        trust_id: params.trust_id,
        amount: params.amount,
      },
      gas: 100n * TGAS,
      deposit: 0n,
    };
  },

  executeWithdrawal(params: ExecuteWithdrawalParams): FunctionCall {
    return {
      methodName: "execute_withdrawal",
      args: {
        trust_id: params.trust_id,
      },
      gas: 100n * TGAS,
      deposit: 0n,
    };
  },

  cancelDeathClaim(params: CancelDeathClaimParams): FunctionCall {
    return {
      methodName: "cancel_death_claim",
      args: {
        trust_id: params.trust_id,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  deposit(params: DepositParams): FunctionCall {
    return {
      contractId: params.token,
      methodName: "ft_transfer_call",
      args: {
        receiver_id: params.wardContract,
        amount: params.amount,
        msg: JSON.stringify({ deposit: params.trust_id }),
      },
      gas: 100n * TGAS,
      deposit: ONE_YOCTO,
    };
  },

  // Guardian calls
  attestDeath(params: AttestDeathParams): FunctionCall {
    CryptoHash.parse(params.evidence_hash);
    return {
      methodName: "attest_death",
      args: {
        trust_id: params.trust_id,
        evidence_hash: params.evidence_hash,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  approve(params: ApproveParams): FunctionCall {
    return {
      methodName: "approve",
      args: {
        request_id: params.request_id,
      },
      gas: 100n * TGAS,
      deposit: 0n,
    };
  },

  reject(params: RejectParams): FunctionCall {
    return {
      methodName: "reject",
      args: {
        request_id: params.request_id,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  vetoWithdrawal(params: VetoWithdrawalParams): FunctionCall {
    return {
      methodName: "veto_withdrawal",
      args: {
        trust_id: params.trust_id,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  pause(params: PauseParams): FunctionCall {
    return {
      methodName: "pause",
      args: {
        trust_id: params.trust_id,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  finalizeActivation(params: FinalizeActivationParams): FunctionCall {
    return {
      methodName: "finalize_activation",
      args: {
        trust_id: params.trust_id,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  // Caregiver & Child calls
  claimAllowance(params: ClaimAllowanceParams): FunctionCall {
    return {
      methodName: "claim_allowance",
      args: {
        trust_id: params.trust_id,
      },
      gas: 100n * TGAS,
      deposit: 0n,
    };
  },

  createRequest(params: CreateRequestParams): FunctionCall {
    if (params.receipt_hash) {
      CryptoHash.parse(params.receipt_hash);
    }
    return {
      methodName: "create_request",
      args: {
        trust_id: params.trust_id,
        kind: params.kind,
        reason: params.reason,
        receipt_hash: params.receipt_hash ?? null,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  flag(params: FlagParams): FunctionCall {
    return {
      methodName: "flag",
      args: {
        request_id: params.request_id,
        child_idx: params.child_idx,
      },
      gas: 50n * TGAS,
      deposit: 0n,
    };
  },

  claimGraduation(params: ClaimGraduationParams): FunctionCall {
    return {
      methodName: "claim_graduation",
      args: {
        trust_id: params.trust_id,
        child_idx: params.child_idx,
      },
      gas: 100n * TGAS,
      deposit: 0n,
    };
  },
};
