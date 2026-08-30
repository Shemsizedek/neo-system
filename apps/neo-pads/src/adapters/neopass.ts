export interface NeopassVerification {
  memberId: string;
  verified: boolean;
  accessEligible: boolean;
}

export async function verifyNeopass(memberId: string, bearerToken?: string): Promise<NeopassVerification> {
  const base = process.env.NEOPASS_API_URL;
  if (!base) {
    return { memberId, verified: false, accessEligible: false };
  }

  const url = new URL(`/verify/${encodeURIComponent(memberId)}`, base);
  const response = await fetch(url, {
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined
  });
  if (!response.ok) throw new Error(`neopass_verification_failed:${response.status}`);

  const body = await response.json() as any;
  return {
    memberId,
    verified: body?.verified === true,
    accessEligible: body?.accessEligible === true || body?.access_eligible === true
  };
}
