export class Program {
  public static readonly Vrc = new Program({
    name: "VRC",
    description: "VEX Robotics Competition",
    role: "197836716726288387",
    emoji: "464676956428828682",
    teamRegExp: /^\d{1,5}[A-Z]?$/i,
    teamExamples: ["1", "12345A"],
    ids: [1],
  });
  public static readonly VexU = new Program({
    name: "VEXU",
    description: "VEX U college and university competition",
    role: "305392771324313610",
    emoji: "464677474509389831",
    teamRegExp: /^[A-Z]{2,5}\d{0,2}$/i,
    teamExamples: ["AB", "ABCDE12"],
    ids: [4],
  });
  public static readonly Vaic = new Program({
    name: "VAIC",
    description: "VEX AI Competition",
    role: "706299363588177940",
    emoji: "811072718274691073",
    teamRegExp: /^(?:\d{1,5}[A-Z]?|[A-Z]{2,5}\d{0,2})$/i,
    teamExamples: ["1", "12345A", "AB", "ABCDE12"],
    ids: [48, 49],
  });
  public static readonly Viqc = new Program({
    name: "VIQC",
    description: "VEX IQ Competition",
    role: "197817210729791489",
    emoji: "464677535461146624",
    teamRegExp: /^\d{1,5}[A-Z]?$/i,
    teamExamples: ["1", "12345A"],
    ids: [41],
  });
  public static readonly Frc = new Program({
    name: "FRC",
    description: "FIRST Robotics Competition",
    role: "263900951738318849",
    emoji: "810644445192126525",
    teamRegExp: /^\d{1,4}$/,
    teamExamples: ["1", "1234"],
  });
  public static readonly Ftc = new Program({
    name: "FTC",
    description: "FIRST Tech Challenge",
    role: "263900951738318849",
    emoji: "810644782215987230",
    teamRegExp: /^\d{1,5}$/,
    teamExamples: ["1", "12345"],
  });
  public static readonly None = new Program({
    name: "None",
    role: "197817210729791489",
    emoji: "❓",
  });

  private static readonly Values = [
    this.Vrc,
    this.VexU,
    this.Vaic,
    this.Viqc,
    this.Frc,
    this.Ftc,
    this.None,
  ];

  public readonly name: string;
  public readonly description?: string;
  public readonly role: string;
  public readonly emoji: string;
  public readonly teamRegExp?: RegExp;
  public readonly teamExamples: string[];
  public readonly ids: number[];

  public constructor(
    data: Omit<Program, "teamExamples" | "ids"> & Partial<Program>,
  ) {
    this.name = data.name;
    this.description = data.description;
    this.role = data.role;
    this.emoji = data.emoji;
    this.teamRegExp = data.teamRegExp;
    this.teamExamples = data.teamExamples ?? [];
    this.ids = data.ids ?? [];
  }

  public static values() {
    return Program.Values;
  }
}
