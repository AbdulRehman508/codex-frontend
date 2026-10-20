/**
 * The largest page the API will serve. Every list DTO on the server caps
 * `limit` at 200 and answers 400 Validation failed above it, so a screen that
 * wants "everything" (an office dropdown, a supplier picker) asks for this,
 * never a made-up big number.
 */
export const MAX_PAGE_SIZE = 200;
