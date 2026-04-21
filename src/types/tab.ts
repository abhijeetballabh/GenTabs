import { z } from 'zod';

export const TabSchema = z.object({
  url: z.string(),
  title: z.string().default(''),
  favicon: z.string().default(''),
  domain: z.string().default(''),
  lastAccessed: z.number().optional(),
  note: z.string().optional(),
  readTime: z.number().optional(),
});

export type Tab = z.infer<typeof TabSchema>;
