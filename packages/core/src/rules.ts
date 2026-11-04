// Mirror of contracts/ward/src/rules.rs for UI previews (W-6.2). PURE. Change both together.
import type { Approval, ChildInput, Guardian, Request, Trust } from "./types.js";

const todo = (t: string): never => { throw new Error(`not implemented: ${t}`); };

export const validateGuardians = (_g: Guardian[], _caregiver: string): string | null => todo("W-6.2");
export const validateShares = (_c: ChildInput[]): string | null => todo("W-6.2");
export const distinctCircles = (_a: Approval[]): number => todo("W-6.2");
export const isSatisfied = (_t: Trust, _r: Request): boolean => todo("W-6.2");
export const allowanceDue = (_t: Trust, _nowNs: bigint): bigint => todo("W-6.2");
