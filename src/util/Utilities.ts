export {};

declare global {
    interface String {
        equals(str: string): boolean;
    }
}

String.prototype.equals = function(str: string): boolean {
    return this === str;
};
