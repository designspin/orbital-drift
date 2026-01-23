import { Input } from "@course/lib";

export class PlayerController {
  private input: Input;

  constructor(input: Input) {
    this.input = input;
  }

  getRotation(): number {
    if (this.input.isActionDown("turnLeft")) return -1;
    if (this.input.isActionDown("turnRight")) return 1;
    return 0;
  }

  isThrusting(): boolean {
    return this.input.isActionDown("thrust");
  }
}