export class Program {
  public static readonly V5rc = new Program({
    name: "V5RC",
    description: "VEX V5 Robotics Competition",
    role: "197836716726288387",
    emoji: "1569789411779027075",
    teamRegExp: /^\d{1,5}[A-Z]?$/i,
    teamExamples: ["1A", "12345A"],
    ids: [1],
  });
  public static readonly Vurc = new Program({
    name: "VURC",
    description: "VEX U Robotics Competition",
    role: "305392771324313610",
    emoji: "1569789410571194378",
    teamRegExp: /^[A-Z]{2,5}\d{0,2}$/i,
    teamExamples: ["AB", "ABCDE1"],
    ids: [4],
  });
  public static readonly Vairc = new Program({
    name: "VAIRC",
    description: "VEX AI Robotics Competition",
    role: "706299363588177940",
    emoji: "1569790852044292248",
    teamRegExp: /^(?:\d{1,5}[A-Z]?|[A-Z]{2,5}\d{0,2})$/i,
    teamExamples: ["1A", "12345A", "AB1", "ABCDE1"],
    ids: [48, 49],
  });
  public static readonly Viqrc = new Program({
    name: "VIQRC",
    description: "VEX IQ Robotics Competition",
    role: "197817210729791489",
    emoji: "1569790852924965015",
    teamRegExp: /^\d{1,5}[A-Z]?$/i,
    teamExamples: ["1A", "12345A"],
    ids: [41],
  });
  public static readonly Achieve = new Program({
    name: "Achieve",
    description: "RECF Achieve Robotics Competition",
    role: "1542032461155012698",
    emoji: "1569789409031749632",
    teamRegExp: /^\d{1,5}[A-Z]?$/i,
    teamExamples: ["1A", "12345A"],
  });
  public static readonly Inspire = new Program({
    name: "Inspire",
    description: "RECF Inspire Robotics Competition",
    role: "1569792079360688258",
    emoji: "1569789409031749632",
    teamRegExp: /^[A-Z]{2,5}\d{0,2}$/i,
    teamExamples: ["AB1", "ABCDE1"],
  });
  public static readonly Frc = new Program({
    name: "FRC",
    description: "FIRST Robotics Competition",
    role: "263900951738318849",
    emoji: "1569790850643529808",
    teamRegExp: /^\d{1,5}$/,
    teamExamples: ["1", "12345"],
  });
  public static readonly Ftc = new Program({
    name: "FTC",
    description: "FIRST Tech Challenge",
    role: "263900951738318849",
    emoji: "1569790849854738492",
    teamRegExp: /^\d{1,5}$/,
    teamExamples: ["1", "12345"],
  });
  public static readonly None = new Program({
    name: "None",
    description: "Other robotics competition program or not a competitor",
    role: "197817210729791489",
    emoji: "❓",
  });

  private static readonly Values = [
    this.V5rc,
    this.Vurc,
    this.Vairc,
    this.Viqrc,
    this.Achieve,
    this.Inspire,
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
