export type HasId = { id: string };

export type VaultStateDecryptor<TInput extends HasId, TOutput extends HasId> = (
  encrypted: TInput[],
) => TOutput[];

export type DecryptionStatus = "inProgress" | "complete" | "error" | "cleared";
