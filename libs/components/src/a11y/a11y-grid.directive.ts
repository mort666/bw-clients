import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import {
  Directive,
  HostBinding,
  HostListener,
  Signal,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { firstValueFrom, skip, filter, take } from "rxjs";

import type { A11yCellDirective } from "./a11y-cell.directive";
import { A11yRowDirective } from "./a11y-row.directive";

/**
 * Implementation of the WAI Data Grid pattern.
 *
 * Adds grid-based keyboard navigation to the host element. Queries for children with `A11yRowDirective` and `A11yCellDirective`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/grid/examples/data-grids/
 */
@Directive({
  selector: "[bitA11yGrid]",
  standalone: true,
})
export class A11yGridDirective {
  private viewPort = inject(CdkVirtualScrollViewport, { optional: true });

  @HostBinding("attr.role")
  role = "grid";

  /** The number of pages to navigate on `PageUp` and `PageDown` */
  pageSize = input(5);

  private rows = contentChildren(A11yRowDirective);
  private rows$ = toObservable(this.rows);

  private grid: Signal<A11yCellDirective[][]> = computed(() =>
    this.rows().map((row) => [...row.cells()]),
  );

  private get numRows(): number {
    return this.viewPort ? this.viewPort.getDataLength() : this.rows().length;
  }

  private activeRow = signal(0);
  private activeCol = signal(0);

  private renderedRow = computed(() => this.convertRealRowToViewportRow(this.activeRow()));
  private numColumns = computed(() => this.grid()[this.renderedRow()].length);

  private focusTarget = computed(() =>
    this.grid()?.[this.renderedRow()]?.[this.activeCol()]?.getFocusTarget(),
  );

  constructor() {
    // Consolidated effect for row/cell roles and tabIndex management (no focus here!)
    effect(() => {
      const focusTarget = this.focusTarget();
      const rows = this.rows();
      const grid = this.grid();

      // Set row roles
      rows.forEach((row) => (row.role = "row"));

      // Set cell roles and tabIndex
      grid.flat().forEach((cell) => {
        cell.role = "gridcell";
        if (cell.getFocusTarget() !== focusTarget) {
          cell.getFocusTarget().tabIndex = -1;
        }
      });
    });
  }

  private async updateRow(delta: number) {
    const prev = this.activeRow();
    let nextRow = prev + delta;

    // Clamp to bounds
    nextRow = Math.max(0, Math.min(nextRow, this.numRows - 1));

    // If the row is not rendered, scroll and wait for it to render before updating
    if (this.viewPort) {
      const { start, end } = this.viewPort.getRenderedRange();
      if (nextRow < start || nextRow >= end) {
        this.viewPort.scrollToIndex(nextRow);
        // Wait until the row is rendered and the cell exists
        await firstValueFrom(
          this.rows$.pipe(
            skip(1),
            filter((rows) => {
              const renderedIdx = this.convertRealRowToViewportRow(nextRow);
              return !!rows[renderedIdx];
            }),
            take(1),
          ),
        );
      }
    }

    // Only set activeRow after ensuring the row is rendered
    this.activeRow.set(nextRow);

    this.focusIfPossible();
  }

  private updateCol(delta: number) {
    this.activeCol.update((prev) => {
      let nextCol = prev + delta;
      const cols = this.numColumns();
      nextCol = Math.max(0, Math.min(nextCol, cols - 1));
      return nextCol;
    });

    this.focusIfPossible();
  }

  private focusIfPossible() {
    const focusTarget = this.focusTarget();
    if (focusTarget && document.body.contains(focusTarget)) {
      focusTarget.tabIndex = 0;
      focusTarget.focus();
    }
  }

  @HostListener("keydown", ["$event"])
  async onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case "ArrowUp":
        await this.updateRow(-1);
        break;
      case "ArrowRight":
        this.updateCol(1);
        break;
      case "ArrowDown":
        await this.updateRow(1);
        break;
      case "ArrowLeft":
        this.updateCol(-1);
        break;
      case "Home":
        await this.updateRow(-this.activeRow());
        break;
      case "End":
        await this.updateRow(this.numRows);
        break;
      case "PageUp":
        await this.updateRow(-this.pageSize());
        break;
      case "PageDown":
        await this.updateRow(this.pageSize());
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /**
   * Converts real row index to viewport row index. The two will differ when list virtualization is used.
   * @param row A row index based on the total number of rows in the grid
   * @returns A row index based on the total number rows being rendered in the viewport.
   */
  private convertRealRowToViewportRow(row: number): number {
    if (this.viewPort) {
      const { start } = this.viewPort.getRenderedRange();
      if (row >= start) {
        return row - start;
      }
    }
    return row;
  }
}
