import type { NeopassVerification } from "./adapters/neopass.js";
import type { BookingRecord } from "./repository.js";

export function canReadBookingStatus(booking: BookingRecord, member: NeopassVerification) {
  return member.verified && member.memberId === booking.memberNeopassId;
}

export function bookingStatusPayload(booking: BookingRecord, settlementRecorded: boolean) {
  const confirmed = booking.state === "CONFIRMED" && settlementRecorded;
  return {
    bookingId: booking.id,
    bookingState: confirmed ? "CONFIRMED" : booking.state === "CONFIRMED" ? "PAYMENT_PENDING" : booking.state,
    settlementState: settlementRecorded ? "SETTLED" : "PENDING",
    entitlementState: confirmed ? booking.entitlement : "PENDING"
  };
}
