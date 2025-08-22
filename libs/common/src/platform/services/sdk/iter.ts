/**
 * Represents an iterator in Rust
 */
export class BwForeignIterator<T> implements Iterator<T> {
  constructor(private iterator: RustIteratorLike<T>) {}

  next(): IteratorResult<T, any> {
    const nextValue = this.iterator.next();
    if (nextValue === undefined) {
      return { value: undefined, done: true };
    }
    return { value: nextValue };
  }
}

export class BwForeignIterable<T> implements Iterable<T> {
  private hasBeenConsumed = false;

  constructor(private iterator: RustIteratorLike<T>) {}

  [Symbol.iterator]() {
    if (this.hasBeenConsumed) {
      throw new Error("Iterator has already been consumed");
    }

    this.hasBeenConsumed = true;
    return new BwForeignIterator(this.iterator);
  }
}

type RustIteratorLike<T> = {
  next(): T | undefined;
};
