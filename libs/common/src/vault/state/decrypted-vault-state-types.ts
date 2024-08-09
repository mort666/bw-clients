export type HasId = { id: string };

export type VaultStateDecryptor<TInput extends HasId, TOutput extends HasId> = (
  encrypted: TInput[],
) => Promise<TOutput[]>;

export type DecryptionStatus = "inProgress" | "complete" | "error" | "cleared";

export type VaultRecord<TId extends string, TRecord extends HasId> = Record<TId, TRecord>;
