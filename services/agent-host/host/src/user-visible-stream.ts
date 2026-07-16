/**
 * Incrementally extracts visible text inside <user_visible>...</user_visible> for streaming.
 */
export class UserVisibleStreamFilter {
  private buffer = '';
  private inside = false;
  private emittedLen = 0;

  push(chunk: string): string {
    this.buffer += chunk;
    let out = '';

    while (true) {
      if (!this.inside) {
        const open = this.buffer.indexOf('<user_visible>');
        if (open < 0) {
          if (this.buffer.length > 32) this.buffer = this.buffer.slice(-32);
          break;
        }
        this.buffer = this.buffer.slice(open + '<user_visible>'.length);
        this.inside = true;
        this.emittedLen = 0;
      }

      const close = this.buffer.indexOf('</user_visible>');
      if (close >= 0) {
        const visible = this.buffer.slice(0, close);
        if (visible.length > this.emittedLen) {
          out += visible.slice(this.emittedLen);
        }
        this.emittedLen = visible.length;
        this.buffer = this.buffer.slice(close + '</user_visible>'.length);
        this.inside = false;
        this.emittedLen = 0;
        continue;
      }

      if (this.buffer.length > this.emittedLen + 24) {
        const safe = this.buffer.slice(0, -16);
        if (safe.length > this.emittedLen) {
          out += safe.slice(this.emittedLen);
          this.emittedLen = safe.length;
        }
      }
      break;
    }

    return out;
  }

  reset() {
    this.buffer = '';
    this.inside = false;
    this.emittedLen = 0;
  }
}
