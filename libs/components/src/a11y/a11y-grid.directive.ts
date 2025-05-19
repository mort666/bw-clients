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
  private renderedRow = computed(() => this.convertRealRowToRenderedRow(this.activeRow()));

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
        this.updateCellFocusByDelta(-1, 0);
        break;
      case "ArrowRight":
        this.updateCellFocusByDelta(0, 1);
        break;
      case "ArrowDown":
        this.updateCellFocusByDelta(1, 0);
        break;
      case "ArrowLeft":
        this.updateCellFocusByDelta(0, -1);
        break;
      case "Home":
        this.updateCellFocusByDelta(-this.activeRow(), 0);
        break;
      case "End":
        this.updateCellFocusByDelta(this.numRows, 0);
        break;
      case "PageUp":
        this.updateCellFocusByDelta(-this.pageSize(), 0);
        break;
      case "PageDown":
        this.updateCellFocusByDelta(this.pageSize(), 0);
        break;
      default:
        return;
    }

    /** Prevent default scrolling behavior */
    event.preventDefault();
  }

  private convertRealRowToRenderedRow(row: number) {
    const range = this.viewPort
      ? this.viewPort.getRenderedRange()
      : { start: 0, end: this.numRows };
    if (row >= range.start && row < range.end) {
      return row - range.start; // Convert real row index to rendered row index
    }
    return row;
  }

  /** Move focus via a delta against the currently active gridcell */
  private updateCellFocusByDelta(rowDelta: number, colDelta: number) {
    let nextCol = this.activeCol() + colDelta;
    let nextRow = this.activeRow() + rowDelta;

    const getNumColumns = (r: number) => this.grid()[this.convertRealRowToRenderedRow(r)].length;

    // Row upper bound
    if (nextRow >= this.numRows) {
      nextRow = this.grid().length - 1;
    }

    // Row lower bound
    if (nextRow < 0) {
      nextRow = 0;
    }

    // Column upper bound
    if (nextCol >= getNumColumns(nextRow)) {
      if (nextRow < this.numRows - 1) {
        // Wrap to next row on right arrow
        nextCol = 0;
        nextRow += 1;
      } else {
        nextCol = getNumColumns(nextRow) - 1;
      }
    }

    // Column lower bound
    if (nextCol < 0) {
      if (nextRow > 0) {
        // Wrap to prev row on left arrow
        nextRow -= 1;
        nextCol = getNumColumns(nextRow) - 1;
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
