import { z } from "zod";
import { conditionIdZ } from "@/lib/rules/schema";

export const coverageCheckBodyZ = z
  .object({
    vaccineId: z.string().uuid().optional(),
    jurisdiction: z.enum([
      "ON", "QC", "NS", "AB", "BC", "MB", "NB", "NL", "PE", "SK", "NT", "NU", "YT",
    ]),
    product: z.enum([
      "Abrysvo",
      "Arexvy",
      "Beyfortus",
      "Shingrix",
      "CovidSpikevax",
      "CovidMNEXSPIKE",
      "CovidNUVAXOVID",
      "HpvGardasil",
      "HpvCervarix",
    ]),
    ageYears: z.number().nonnegative(),
    ageMonths: z.number().nonnegative().optional(),
    pregnant: z.boolean().optional(),
    gestationalWeeks: z.number().nonnegative().optional(),
    deliverDuringRsvSeason: z.boolean().optional(),
    previouslyReceivedPublicAdultRsv: z.boolean().optional(),
    pediatricSpecialistDiscussed: z.boolean().optional(),
    conditionIds: z.array(conditionIdZ).default([]),
    considerNaci: z.boolean().optional(),
  })
  .strict();

export type CoverageCheckBody = z.infer<typeof coverageCheckBodyZ>;
