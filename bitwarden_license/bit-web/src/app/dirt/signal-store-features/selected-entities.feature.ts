import { computed } from "@angular/core";
import { signalStoreFeature, type, withComputed, withState } from "@ngrx/signals";
import { EntityId, EntityState } from "@ngrx/signals/entities";

type SelectedEntityIds = Set<EntityId>;
export type SelectedEntityState = { selectedEntityIds: SelectedEntityIds };

// Add an ID to the set (returns new state)
export function addSelectedEntityId(
  currentSelectedEntityIds: SelectedEntityIds,
  id: EntityId,
): SelectedEntityState {
  return {
    selectedEntityIds: new Set([...currentSelectedEntityIds, id]),
  };
}

// Remove an ID from the set (returns new state)
export function removeSelectedEntityId(
  currentSelectedEntityIds: SelectedEntityIds,
  id: EntityId,
): SelectedEntityState {
  const newSet = new Set(currentSelectedEntityIds);
  newSet.delete(id);
  return {
    selectedEntityIds: newSet,
  };
}

export function clearSelectedEntityIds(): SelectedEntityState {
  return { selectedEntityIds: new Set<EntityId>() };
}

/**
 * A feature that provides the ability to manage multiple selected entities
 *
 * @returns A feature that provides selected entity state management.
 */
export function withSelectedEntitiesFeature<Entity>() {
  return signalStoreFeature(
    { state: type<EntityState<Entity>>() },
    withState<SelectedEntityState>({ selectedEntityIds: new Set<EntityId>() }),
    withComputed(({ entityMap, selectedEntityIds }) => ({
      selectedEntities: computed(() => {
        const entities: Array<Entity> = [];
        selectedEntityIds().forEach((id) => {
          const entity = entityMap()[id];
          if (entity) {
            entities.push(entity);
          }
        });
        return entities;
      }),
    })),
  );
}
