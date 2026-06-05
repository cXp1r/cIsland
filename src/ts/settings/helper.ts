export function get_parent(p: string): string {
    const arr = p.split("\\");
    arr.pop();
    return arr.join("\\");
}