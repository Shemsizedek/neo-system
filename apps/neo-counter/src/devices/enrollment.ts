import type { DeviceKind, PairedDevice } from './types';

export const FOUNDER_SUBJECT='neo:founder:000001' as const;

export type DeviceEnrollment={
  enrollmentId:string;
  deviceId:string;
  kind:DeviceKind;
  ownerSubject:string;
  verified:boolean;
  attested:boolean;
  enrolledAt:string;
};

export function createDeviceEnrollment(device:PairedDevice,input:{ownerSubject:string;verified:boolean;attested:boolean}):DeviceEnrollment{
  if(!input.ownerSubject) throw new Error('Device owner subject is required.');
  if(!input.verified) throw new Error('Verified operator enrollment is required.');
  if(!input.attested) throw new Error('Device attestation is required.');
  return Object.freeze({
    enrollmentId:`device-enrollment:${crypto.randomUUID()}`,
    deviceId:device.id,
    kind:device.kind,
    ownerSubject:input.ownerSubject,
    verified:true,
    attested:true,
    enrolledAt:new Date().toISOString()
  });
}

export function canAuthorizeTransaction(enrollment:DeviceEnrollment,authenticatedSubject:string){
  return enrollment.verified===true&&enrollment.attested===true&&enrollment.ownerSubject===authenticatedSubject;
}

export function founderStatus(enrollment:DeviceEnrollment|null){
  return enrollment?.ownerSubject===FOUNDER_SUBJECT&&enrollment.verified&&enrollment.attested?'verified':'not-enrolled';
}
