import { computed } from "@angular/core";
import { signalStoreFeature, withComputed, withMethods, withState } from "@ngrx/signals";

export type DrawerContext = "None" | "OrganizationMembers" | "ApplicationMembers" | "Applications";

export interface DrawerState {
  drawerOpen: boolean;
  drawerInvokerId: string;
  activeDrawerType: DrawerContext;
}

export function openDrawerForOrganizationMembers(): DrawerState {
  return {
    drawerOpen: true,
    activeDrawerType: "OrganizationMembers",
    drawerInvokerId: "",
  };
}
export function openDrawerForApplicationMembers(drawerInvokerId: string = ""): DrawerState {
  return {
    drawerOpen: true,
    activeDrawerType: "ApplicationMembers",
    drawerInvokerId,
  };
}
export function openDrawerForApplications(drawerInvokerId: string = ""): DrawerState {
  return {
    drawerOpen: true,
    activeDrawerType: "Applications",
    drawerInvokerId,
  };
}
export function closeDrawer(): DrawerState {
  return {
    drawerOpen: false,
    activeDrawerType: "None",
    drawerInvokerId: "",
  };
}

export function withDrawerFeature() {
  return signalStoreFeature(
    withState<DrawerState>({
      drawerOpen: false,
      drawerInvokerId: "",
      activeDrawerType: "None",
    }),
    withComputed((store) => ({
      isApplicationDrawerActive: computed(() => store.activeDrawerType() === "Applications"),
      isApplicationMembersDrawerActive: computed(
        () => store.activeDrawerType() === "ApplicationMembers",
      ),
      isOrganizationMembersDrawerActive: computed(
        () => store.activeDrawerType() === "OrganizationMembers",
      ),
    })),
    withMethods((store) => ({
      isActiveDrawerType: (drawerType: DrawerContext): boolean => {
        return store.activeDrawerType() === drawerType;
      },
    })),
  );
}
