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

  private constructor(
    public readonly name: string,
    public readonly milliseconds: number,
    public readonly modulo?: number
  ) {}

  public static values() {
    return DurationUnit.Values;
  }

  public format(value: number) {
    return `${value} ${this.name}${value === 1 ? '' : 's'}`;
  }
}
