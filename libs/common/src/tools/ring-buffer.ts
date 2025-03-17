/** A simple ring buffer; not in any way threadsafe */
export class RingBuffer<T> {
  constructor(private capacity: number) {
    this.buffer = new Array(capacity).fill(null);
  }

  private buffer: Array<T>;
  private head: number = 0;
  private tail: number = 0;
  private _length: number = 0;

  /** The number of entries presently stored by the ring buffer */
  get length() {
    return this._length;
  }

  /** `true` when the buffer is full.  */
  get full() {
    return this.length === this.capacity;
  }

  /** `true` when the buffer is empty */
  get empty() {
    return !this.length;
  }

  /** Adds an item to the head of the buffer
   *  @param value the item to add
   *  @returns `true` if the item was added, otherwise `false`.
   */
  enqueue(value: T) {
    if (this.full) {
      return false;
    }

    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    this._length++;
  }

  /** Removes the item at the tail of the buffer
   *  @returns the tail item if the buffer contains any entries,
   *   otherwise `undefined`.
   */
  dequeue(): T | undefined {
    if (this.empty) {
      return undefined;
    }

    const value = this.buffer[this.tail];
    this.tail = (this.tail + 1) % this.capacity;
    this._length--;
    return value;
  }
}
