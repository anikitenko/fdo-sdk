import { CircularBuffer } from '../src/utils/CircularBuffer';

describe('CircularBuffer', () => {
    let buffer: CircularBuffer<number>;

    beforeEach(() => {
        buffer = new CircularBuffer<number>(3);
    });

    it('should initialize empty', () => {
        expect(buffer.length).toBe(0);
        expect(buffer.maxSize).toBe(3);
        expect(buffer.toArray()).toEqual([]);
    });

    it('should add items up to capacity', () => {
        buffer.push(1);
        buffer.push(2);
        buffer.push(3);
        expect(buffer.length).toBe(3);
        expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should overwrite oldest items when full', () => {
        buffer.push(1);
        buffer.push(2);
        buffer.push(3);
        buffer.push(4);
        expect(buffer.toArray()).toEqual([2, 3, 4]);
    });

    it('should pop oldest items first', () => {
        buffer.push(1);
        buffer.push(2);
        expect(buffer.pop()).toBe(1);
        expect(buffer.pop()).toBe(2);
        expect(buffer.pop()).toBeUndefined();
    });

    it('should peek at oldest item without removing', () => {
        buffer.push(1);
        buffer.push(2);
        expect(buffer.peek()).toBe(1);
        expect(buffer.length).toBe(2);
    });

    it('should clear all items', () => {
        buffer.push(1);
        buffer.push(2);
        buffer.clear();
        expect(buffer.length).toBe(0);
        expect(buffer.toArray()).toEqual([]);
    });

    it('should handle gaps in the buffer from pop operations', () => {
        buffer.push(1);
        buffer.push(2);
        buffer.push(3);
        buffer.pop(); // Creates a gap at the start
        buffer.push(4);
        expect(buffer.toArray()).toEqual([2, 3, 4]);
    });
});