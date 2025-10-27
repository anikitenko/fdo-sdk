/**
 * Circular buffer implementation for notification management.
 * Efficiently manages fixed-size notification storage with FIFO behavior.
 */
export class CircularBuffer<T> {
    private buffer: Array<T | undefined>;
    private head = 0;
    private tail = 0;
    private size = 0;

    /**
     * Creates a new circular buffer with specified capacity.
     * @param capacity Maximum number of items the buffer can hold
     */
    constructor(private capacity: number) {
        this.buffer = new Array(capacity);
    }

    /**
     * Adds an item to the buffer. If buffer is full, oldest item is overwritten.
     * @param item Item to add
     * @returns The item that was overwritten, if any
     */
    push(item: T): T | undefined {
        const overwritten = this.buffer[this.head];
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.capacity;
        if (this.size < this.capacity) {
            this.size++;
        } else {
            this.tail = (this.tail + 1) % this.capacity;
        }
        return overwritten;
    }

    /**
     * Removes and returns the oldest item from the buffer.
     * @returns The oldest item or undefined if buffer is empty
     */
    pop(): T | undefined {
        if (this.size === 0) return undefined;
        
        const item = this.buffer[this.tail];
        this.buffer[this.tail] = undefined;
        this.tail = (this.tail + 1) % this.capacity;
        this.size--;
        return item;
    }

    /**
     * Returns the oldest item without removing it.
     * @returns The oldest item or undefined if buffer is empty
     */
    peek(): T | undefined {
        return this.size === 0 ? undefined : this.buffer[this.tail];
    }

    /**
     * Returns all items in order from oldest to newest.
     * @returns Array of items
     */
    toArray(): T[] {
        const result: T[] = [];
        let current = this.tail;
        for (let i = 0; i < this.size; i++) {
            if (this.buffer[current] !== undefined) {
                result.push(this.buffer[current] as T);
            }
            current = (current + 1) % this.capacity;
        }
        return result;
    }

    /**
     * Current number of items in the buffer.
     */
    get length(): number {
        return this.size;
    }

    /**
     * Maximum number of items the buffer can hold.
     */
    get maxSize(): number {
        return this.capacity;
    }

    /**
     * Clears all items from the buffer.
     */
    clear(): void {
        this.buffer = new Array(this.capacity);
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }
}