export class PaymentProviderAdapter {
  constructor(name='REFERENCE'){ this.name=name }
  async createPaymentSession(){ throw new Error('NOT_IMPLEMENTED') }
  async verifyWebhook(){ throw new Error('NOT_IMPLEMENTED') }
  async refund(){ throw new Error('NOT_IMPLEMENTED') }
}

export class ReferencePaymentAdapter extends PaymentProviderAdapter {
  constructor(){ super('REFERENCE') }
  async createPaymentSession({checkout}) {
    return {provider:this.name,providerSessionId:`ref_${checkout.checkoutId}`,status:'PENDING',simulation:true}
  }
  async verifyWebhook(event) {
    if (!event?.eventId || !event?.paymentStatus) throw new Error('INVALID_REFERENCE_EVENT')
    return {...event,verified:true,simulation:true}
  }
  async refund({refund}) {
    return {provider:this.name,providerRefundId:`ref_${refund.refundId}`,status:'REFUNDED',simulation:true}
  }
}

export function providerFromName(name='REFERENCE') {
  if (name === 'REFERENCE') return new ReferencePaymentAdapter()
  throw new Error(`PAYMENT_PROVIDER_NOT_CONFIGURED:${name}`)
}
