import { computed } from "@angular/core";
import { signalStoreFeature, type, withComputed, withState } from "@ngrx/signals";
import { EntityId, EntityState } from "@ngrx/signals/entities";

export type SelectedEntityState = { selectedEntityId: EntityId | null };

export function setSelectedEntityId(id: EntityId | null): SelectedEntityState {
  return { selectedEntityId: id };
}

/**
 * A feature that provides the ability to manage one selected entity
 *
 * @returns A feature that provides selected entity state management.
 */
export function withSelectedEntityFeature<Entity>() {
  return signalStoreFeature(
    { state: type<EntityState<Entity>>() },
    withState<SelectedEntityState>({ selectedEntityId: null }),
    withComputed(({ entityMap, selectedEntityId }) => ({
      selectedEntity: computed(() => {
        const selectedId = selectedEntityId();
        return selectedId ? entityMap()[selectedId] : null;
      }),
    })),
  );
}
