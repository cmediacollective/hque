// Media brands (e.g. Momé, Mommish) live in the creators table so pitches can
// link to them, but they aren't talent. Talent-roster queries hide anything
// labeled "Media brand" in either type field. The `is.null` halves keep rows
// with no type at all — a bare neq / not-contains would drop those too.
export function excludeMediaBrands(query) {
  return query
    .or('type.is.null,type.neq.Media brand')
    .or('types.is.null,types.not.cs.{"Media brand"}')
}
