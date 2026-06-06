export function get_parent(p: string): string {
    const arr = p.split("\\");
    arr.pop();
    return arr.join("\\");
}

export function sanitize(v: string) {
    return v.replace(/[^a-zA-Z0-9_/\\\:]/g, "");
}
