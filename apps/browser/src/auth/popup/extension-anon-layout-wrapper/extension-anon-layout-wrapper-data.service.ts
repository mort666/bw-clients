import { BehaviorSubject, Observable } from "rxjs";
import { AnonLayoutWrapperData, AnonLayoutWrapperDataService } from "@bitwarden/auth/angular";
import { ExtensionAnonLayoutWrapperData } from "./extension-anon-layout-wrapper.component";
import { DefaultAnonLayoutWrapperDataService } from "@bitwarden/auth/angular";

export class ExtensionAnonLayoutWrapperDataService
  extends DefaultAnonLayoutWrapperDataService
  implements AnonLayoutWrapperDataService
{
  protected anonLayoutWrapperDataSubject = new BehaviorSubject<ExtensionAnonLayoutWrapperData>(
    null,
  );
  anonLayoutWrapperDataObservable$ = this.anonLayoutWrapperDataSubject.asObservable();

  anonLayoutWrapperData$(): Observable<AnonLayoutWrapperData> {
    return this.anonLayoutWrapperDataObservable$;
  }

  setAnonLayoutWrapperData(data: ExtensionAnonLayoutWrapperData): void {
    this.anonLayoutWrapperDataSubject.next(data);
  }

  getAnonLayoutWrapperData$(): Observable<ExtensionAnonLayoutWrapperData> {
    return this.anonLayoutWrapperDataObservable$;
  }
}
