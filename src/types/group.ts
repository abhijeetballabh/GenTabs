import { z } from 'zod';
import { TabSchema } from './tab';

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  tabs: z.array(TabSchema),
  windowScope: z.enum(['current', 'all']).optional(),
  isPinned: z.boolean().optional(),
  customName: z.boolean().optional(),
  emoji: z.string().optional(),
  color: z.string().optional(),
  schedule: z.object({
    onLaunch: z.boolean().optional(),
    dailyTime: z.string().optional(),
  }).optional(),
});

export type Group = z.infer<typeof GroupSchema>;
