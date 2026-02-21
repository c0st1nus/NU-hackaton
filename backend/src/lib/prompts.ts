import { parse } from "smol-toml";
import { resolve } from "node:path";

interface Prompts {
  star_task: {
    system: string;
    analytics: string;
  };
  analysis: {
    system: string;
  };
}

const tomlPath = resolve(import.meta.dir, "../../prompts.toml");
const raw = await Bun.file(tomlPath).text();

export const prompts: Prompts = parse(raw) as unknown as Prompts;
