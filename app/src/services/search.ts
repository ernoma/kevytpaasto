import { MIN_SEARCH_LENGTH, searchTerms, searchText } from '@/domain/fineli';

import type { ServiceContext } from './context';
import { isFineliAvailable, searchFineli, type FineliFood } from './fineli';
import { listFoods, type Food } from './foods';

export interface FoodSearchResults {
  own: Food[];
  fineli: FineliFood[];
  /** False if fineli.db could not be attached; own foods are still searched. */
  fineliAvailable: boolean;
}

/**
 * Searches the user's own foods and Fineli on the device, so search works without network
 * (HAK-02, LAA-04). Own foods match when every word occurs anywhere in the name or brand.
 */
export function searchFoods(ctx: ServiceContext, text: string): FoodSearchResults {
  const fineliAvailable = isFineliAvailable(ctx);
  const terms = searchTerms(text);
  if (terms.join('').length < MIN_SEARCH_LENGTH) {
    return { own: [], fineli: [], fineliAvailable };
  }
  const own = listFoods(ctx).filter((item) => {
    const haystack = searchText(`${item.name} ${item.brand ?? ''}`);
    return terms.every((term) => haystack.includes(term));
  });
  return { own, fineli: fineliAvailable ? searchFineli(ctx, text) : [], fineliAvailable };
}
