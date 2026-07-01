// Numbers every LLM call within one submission so server logs read as a
// clear trace: "[LLM call 1] ...", "[LLM call 2] ...", in call order.
export class CallCounter {
  private n = 0;

  label(text: string): string {
    this.n += 1;
    return `[LLM call ${this.n}] ${text}`;
  }

  get count(): number {
    return this.n;
  }
}
