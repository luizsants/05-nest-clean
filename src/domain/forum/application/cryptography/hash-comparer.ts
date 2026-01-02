export abstract class HashCompare {
  abstract compare(plain: string, hashed: string): Promise<boolean>
}
