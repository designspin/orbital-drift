import { Input } from "@course/lib";

export class PlayerController {
  private input: Input;

  constructor(input: Input) {
    this.input = input;
  }

  getRotation(): number {
    if(this.input.isDown("ArrowLeft")) return -1;
    if(this.input.isDown("ArrowRight")) return 1;
    return 0;
  }

  isThrusting(): boolean {
    return this.input.isDown("ArrowUp");
  }
}