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
  selector: "bitA11yGrid",
  standalone: true,
})
export class A11yGridDirective {
  private viewPort = inject(CdkVirtualScrollViewport, { optional: true });

  @HostBinding("attr.role")
  role = "grid";

  /** The number of pages to navigate on `PageUp` and `PageDown` */
  pageSize = input(5);

  private rows = contentChildren(A11yRowDirective);

  private grid: Signal<A11yCellDirective[][]> = computed(() =>
    this.rows().map((row) => [...row.cells()]),
  );

  private get numRows(): number {
    return this.viewPort ? this.viewPort.getDataLength() : this.rows().length;
  }

  /** The row that currently has focus */
  private activeRow = signal(0);
  private renderedRow = computed(() => this.convertRealRowToViewportRow(this.activeRow()));

  /** The cell that currently has focus */
  private activeCol = signal(0);

  private focusTarget = computed(() =>
    this.grid()?.[this.renderedRow()]?.[this.activeCol()]?.getFocusTarget(),
  );

  constructor() {
    effect(() => {
      this.rows().forEach((row) => (row.role = "row"));
      this.grid()
        .flat()
        .forEach((cell) => {
          cell.role = "gridcell";
          if (cell.getFocusTarget() !== this.focusTarget()) {
            cell.getFocusTarget().tabIndex = -1;
          }
        });
    });
  }

  @HostListener("keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case "ArrowUp":
        this.updateActiveCell(-1, 0);
        break;
      case "ArrowRight":
        this.updateActiveCell(0, 1);
        break;
      case "ArrowDown":
        this.updateActiveCell(1, 0);
        break;
      case "ArrowLeft":
        this.updateActiveCell(0, -1);
        break;
      case "Home":
        this.updateActiveCell(-this.activeRow(), 0);
        break;
      case "End":
        this.updateActiveCell(this.numRows, 0);
        break;
      case "PageUp":
        this.updateActiveCell(-this.pageSize(), 0);
        break;
      case "PageDown":
        this.updateActiveCell(this.pageSize(), 0);
        break;
      default:
        return;
    }

    /** Prevent default scrolling behavior */
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
      // TODO, removing this console log makes things break
      // eslint-disable-next-line no-console
      console.log(`row: ${row}, start: ${start}, gridLength: ${this.grid().length}`);
      if (row >= start) {
        return row - start;
      }
    }

    return row;
  }

  /** Get the number of columns for a particular row */
  private getNumColumns(row: number) {
    return this.grid()[this.convertRealRowToViewportRow(row)].length;
  }

  private scrollRowIntoViewport(row: number) {
    if (!this.viewPort) {
      return;
    }

    const { start, end } = this.viewPort.getRenderedRange();

    if (row >= start && row <= end) {
      return;
    }

    this.viewPort.scrollToIndex(row);
  }

  /** Move focus via a delta against the currently active gridcell */
  private updateActiveCell(rowDelta: number, colDelta: number) {
    let nextCol = this.activeCol() + colDelta;
    let nextRow = this.activeRow() + rowDelta;

    // Row upper bound
    if (nextRow >= this.numRows) {
      nextRow = this.grid().length - 1;
    }

    // Row lower bound
    if (nextRow < 0) {
      nextRow = 0;
    }

    // The row must exist in the viewport before we can query its columns
    this.scrollRowIntoViewport(nextRow);

    // Column upper bound
    if (nextCol >= this.getNumColumns(nextRow)) {
      if (nextRow < this.numRows - 1) {
        // Wrap to next row on right arrow
        nextCol = 0;
        nextRow += 1;
      } else {
        nextCol = this.getNumColumns(nextRow) - 1;
      }
    }

    // Column lower bound
    if (nextCol < 0) {
      if (nextRow > 0) {
        // Wrap to prev row on left arrow
        nextRow -= 1;
        nextCol = this.getNumColumns(nextRow) - 1;
      } else {
        nextCol = 0;
      }
    }

    this.activeCol.set(nextCol);
    this.activeRow.set(nextRow);

    this.focusTarget().tabIndex = 0;
    this.focusTarget().focus();
  }
}
