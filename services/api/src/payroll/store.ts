import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EncryptedBlob, IReceiptStore, StoredReceipt } from "./types.js";

/** Supabase-backed receipt store (production) */
export class SupabaseReceiptStore implements IReceiptStore {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async create(encryptedBlob: EncryptedBlob, walletAddress: string): Promise<StoredReceipt> {
    const { data, error } = await this.supabase
      .from("receipts")
      .insert({ wallet_address: walletAddress, encrypted_blob: encryptedBlob })
      .select()
      .single();

    if (error) throw new Error(`Supabase insert failed: ${error.message}`);

    return mapRow(data);
  }

  async get(receiptId: string): Promise<StoredReceipt | undefined> {
    const { data, error } = await this.supabase
      .from("receipts")
      .select()
      .eq("receipt_id", receiptId)
      .single();

    if (error?.code === "PGRST116") return undefined;
    if (error) throw new Error(`Supabase get failed: ${error.message}`);

    return mapRow(data);
  }

  async getByWallet(walletAddress: string): Promise<StoredReceipt[]> {
    const { data, error } = await this.supabase
      .from("receipts")
      .select()
      .ilike("wallet_address", walletAddress);

    if (error) throw new Error(`Supabase getByWallet failed: ${error.message}`);

    return (data ?? []).map(mapRow);
  }
}

function mapRow(row: Record<string, unknown>): StoredReceipt {
  return {
    receiptId: row.receipt_id as string,
    createdAt: row.created_at as string,
    encryptedBlob: row.encrypted_blob as EncryptedBlob,
    walletAddress: row.wallet_address as string,
  };
}

/** In-memory receipt store (tests) */
export class MemoryReceiptStore implements IReceiptStore {
  private readonly records = new Map<string, StoredReceipt>();
  private readonly walletIndex = new Map<string, string[]>();

  async create(encryptedBlob: EncryptedBlob, walletAddress: string): Promise<StoredReceipt> {
    const receiptId = randomUUID();
    const createdAt = new Date().toISOString();

    const record: StoredReceipt = {
      receiptId,
      createdAt,
      encryptedBlob,
      walletAddress,
    };

    this.records.set(receiptId, record);

    const normalized = walletAddress.toLowerCase();
    const existing = this.walletIndex.get(normalized) ?? [];
    existing.push(receiptId);
    this.walletIndex.set(normalized, existing);

    return record;
  }

  async get(receiptId: string): Promise<StoredReceipt | undefined> {
    return this.records.get(receiptId);
  }

  async getByWallet(walletAddress: string): Promise<StoredReceipt[]> {
    const normalized = walletAddress.toLowerCase();
    const ids = this.walletIndex.get(normalized) ?? [];
    return ids
      .map((id) => this.records.get(id))
      .filter((r): r is StoredReceipt => r !== undefined);
  }
}
