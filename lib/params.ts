/** Normalise ?page / ?age from archive searchParams. */
export async function parseArchiveParams(
  sp: Promise<{ page?: string; age?: string }>,
): Promise<{ page: number; age?: string }> {
  const params = await sp;
  const page = Math.max(1, Number(params.page) || 1);
  const age = params.age?.trim() || undefined;
  return { page, age };
}
