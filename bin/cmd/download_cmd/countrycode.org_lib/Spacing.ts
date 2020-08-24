export class Spacing {
    private spacing = 0
    up = () => (this.spacing += 1)
    down = () => (this.spacing -= 1)
    toString = () => "    ".repeat(this.spacing)
}
