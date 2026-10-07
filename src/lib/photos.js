import { itemCost } from './costs.js';

/**
 * Photos live on each option (quote). Items saved before that keep an
 * item-level `photos` list, still shown until the item is edited again.
 */
export const quotePhotos = q => q?.photos || [];

/** Every photo an item holds, for deleting them together with the item. */
export const allPhotos = it => [...(it.photos || []), ...(it.quotes || []).flatMap(quotePhotos)];

/** Thumbnail for the list row: the chosen or cheapest option's photo, then any option's, then a legacy item photo. */
export function coverPhoto(it) {
  const c = itemCost(it);
  if (c && quotePhotos(c.q).length) return quotePhotos(c.q)[0];
  const withPhoto = (it.quotes || []).find(q => quotePhotos(q).length);
  return withPhoto ? quotePhotos(withPhoto)[0] : (it.photos || [])[0];
}
