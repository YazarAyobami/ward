// The ONLY place that knows ward method names and argument shapes (W-6.3).
import type { ChildStatus, Request, Trust } from "./types.js";

export interface ViewClient {
  getTrust(id: number): Promise<Trust | null>;
  getTrustsFor(account: string): Promise<Trust[]>;
  getRequests(trustId: number, fromIndex?: number, limit?: number): Promise<Request[]>;
  getChildStatus(trustId: number, childIdx: number): Promise<ChildStatus>;
  getAllowanceDue(trustId: number): Promise<string>;
}

export interface FunctionCall { methodName: string; args: Record<string, unknown>; gas: bigint; deposit: bigint }

export const createViewClient = (_rpcUrl: string, _contractId: string): ViewClient => {
  throw new Error("not implemented: W-6.3");
};

// TODO(W-6.3): one builder per method in ARCHITECTURE §5
export const calls: Record<string, (...args: never[]) => FunctionCall> = {};
