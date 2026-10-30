import "server-only";
import { database } from "./db";
import { applyStateOperations, emptyAccountState } from "@/shared/account-state";
import type { StateEnvelope, StateOperation } from "@/shared/account-state";

export async function readAccountState(accountId: string): Promise<StateEnvelope> {
  const sql = database();
  await sql`INSERT INTO account_states(account_id,state) VALUES (${accountId},${JSON.stringify(emptyAccountState())}::jsonb) ON CONFLICT DO NOTHING`;
  const rows = await sql`SELECT state,version FROM account_states WHERE account_id=${accountId}`;
  return { state: rows[0].state, version: Number(rows[0].version), acknowledged: [] };
}

export async function mutateAccountState(accountId: string, baseVersion: number, operations: StateOperation[]) {
  const current = await readAccountState(accountId);
  const sql = database();
  const ids = operations.map(op => op.id);
  const applied = await sql`SELECT operation_id FROM account_mutations WHERE account_id=${accountId} AND operation_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`;
  const known = new Set(applied.map(row => row.operation_id));
  if (known.size === operations.length) return { ...current, acknowledged: ids, conflict: false };
  if (baseVersion !== current.version) return { ...current, acknowledged: [...known] as string[], conflict: true };
  const pending = operations.filter(op => !known.has(op.id));
  const next = applyStateOperations(current.state, pending);
  if (JSON.stringify(next).length > 2_000_000) throw new Error("account_storage_limit");
  const rows = await sql`SELECT commit_account_state(${accountId},${baseVersion},${JSON.stringify(next)}::jsonb,${JSON.stringify(pending.map(op => op.id))}::jsonb) AS result`;
  const result = rows[0].result as StateEnvelope & { conflict: boolean };
  return { ...result, version: Number(result.version), acknowledged: [...new Set([...known as Set<string>, ...result.acknowledged])] };
}
