export const campaignSeeds = ['arena', 'campaign-v2/2', 'campaign-v2/3', 'campaign-v2/4'] as const
export type CampaignVariant = 0 | 1 | 2 | 3

export function campaignVariant(seed: string): CampaignVariant {
  const index = campaignSeeds.findIndex(candidate => candidate === seed)
  return index > 0 ? index as CampaignVariant : 0
}

export const campaignLevelCount = campaignSeeds.length * 5 * 5
