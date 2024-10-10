import { CipherId } from "@bitwarden/common/types/guid";

export type PasswordsReportData = {
  name: string;
};

export interface ReportUserData {
  userName: string;
  email: string;
  usesKeyConnector: boolean;
  cipherIds: CipherId[];
}
