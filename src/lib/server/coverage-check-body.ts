import { z } from "zod";
import { conditionIdZ } from "@/lib/rules/schema";

export const coverageCheckBodyZ = z
  .object({
    vaccineId: z.string().uuid().optional(),
    jurisdiction: z.enum(["ON", "QC", "NS"]),
    product: z.enum(["Abrysvo", "Arexvy", "Beyfortus"]),
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
