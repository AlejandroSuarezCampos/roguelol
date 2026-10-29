/** RNG con semilla (mulberry32): reproducible en tests y guardable como un número (`state`). */
export class Rng {
  constructor(public state: number) {}

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Orden aleatorio donde los elementos de más peso tienden a salir antes (sin reposición): clave `u^(1/peso)`. */
  weightedShuffle<T>(arr: readonly T[], weight: (x: T) => number): T[] {
    return arr
      .map((x) => ({ x, k: Math.pow(this.next(), 1 / Math.max(weight(x), 1e-6)) }))
      .sort((a, b) => b.k - a.k)
      .map((e) => e.x);
  }
}
