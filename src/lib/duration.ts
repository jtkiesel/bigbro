export class DurationUnit {
  private static readonly Values = [
    {name: 'day', milliseconds: 86_400_000},
    {name: 'hour', milliseconds: 3_600_000},
    {name: 'minute', milliseconds: 60_000},
    {name: 'second', milliseconds: 1_000},
  ].map(
    ({name, milliseconds}, index, array) =>
      new DurationUnit(
        name,
        milliseconds,
        index > 0 ? array[index - 1].milliseconds / milliseconds : undefined
      )
  );

  public readonly name;
  public readonly milliseconds;
  public readonly modulo?;

  private constructor(name: string, milliseconds: number, modulo?: number) {
    this.name = name;
    this.milliseconds = milliseconds;
    this.modulo = modulo;
  }

  public static values() {
    return DurationUnit.Values;
  }

  public format(value: number) {
    return `${value} ${this.name}${value === 1 ? '' : 's'}`;
  }
}
