import { randomInt, randomUUID } from 'node:crypto';

type JsonRecord = Record<string, unknown>;

function text(payload: JsonRecord, field: string) {
  return String(payload[field] ?? '').trim();
}

function number(payload: JsonRecord, field: string, fallback = 0) {
  const value = Number(payload[field] ?? fallback);
  if (!Number.isFinite(value)) throw new Error(`Invalid ${field}.`);
  return Math.round(value * 100) / 100;
}

export function requireExternalUser(payload: JsonRecord) {
  if (!text(payload, 'externalUserId')) throw new Error('externalUserId is required.');
}

export function createCardholder(payload: JsonRecord) {
  const required = ['firstName', 'lastName', 'dob', 'email', 'phone'];
  const missing = required.filter((field) => !text(payload, field));
  if (missing.length) throw new Error(`Missing cardholder fields: ${missing.join(', ')}`);

  return {
    commissionBalance: 3250,
    walletBalance: 0,
    cardholder: {
      id: `ch_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
      firstName: text(payload, 'firstName'),
      lastName: text(payload, 'lastName'),
      dob: text(payload, 'dob'),
      email: text(payload, 'email'),
      phone: text(payload, 'phone'),
      status: 'ACTIVE',
    },
    cards: [],
    transactions: [],
    api: 'VCCHUB demo · create cardholder',
  };
}

export function topUpWallet(payload: JsonRecord) {
  const amount = number(payload, 'amount');
  const commissionBalance = number(payload, 'commissionBalance', 3250);
  const walletBalance = number(payload, 'walletBalance');
  if (amount <= 0) throw new Error('Top-up amount must be greater than zero.');
  if (amount > commissionBalance) {
    return { conflict: true, error: 'Insufficient Ollylife commission balance.' };
  }

  return {
    commissionBalance: Math.round((commissionBalance - amount) * 100) / 100,
    walletBalance: Math.round((walletBalance + amount) * 100) / 100,
    cardholder: payload.cardholder ?? null,
    cards: Array.isArray(payload.cards) ? payload.cards : [],
    transactions: [
      {
        id: `top_${randomUUID().replaceAll('-', '').slice(0, 10)}`,
        type: 'Ollylife commission top-up',
        amount,
        status: 'COMPLETED',
      },
    ],
    apiTrace: [
      'VCCHUB → Ollylife: check commission balance',
      'Ollylife: commission debit approved',
      'Ollylife → VCCHUB: wallet credit completed',
    ],
  };
}

export function createCard(payload: JsonRecord) {
  const walletBalance = number(payload, 'walletBalance');
  if (walletBalance <= 0) {
    return { conflict: true, error: 'Top up the wallet before creating a card.' };
  }

  const cardholder = (payload.cardholder ?? {}) as JsonRecord;
  const billingAddress = (payload.billingAddress ?? {}) as JsonRecord;
  const cardType = text(payload, 'cardType').toUpperCase() || 'VIRTUAL';
  if (!['VIRTUAL', 'PHYSICAL'].includes(cardType)) {
    throw new Error('Card type must be VIRTUAL or PHYSICAL.');
  }
  if (!text(cardholder, 'firstName') || !text(cardholder, 'lastName')) {
    throw new Error('Create the VCCHUB cardholder before creating a card.');
  }
  const requiredAddress = ['country', 'state', 'city', 'address', 'postalCode'];
  const missing = requiredAddress.filter((field) => !text(billingAddress, field));
  if (missing.length) throw new Error(`Missing billing address fields: ${missing.join(', ')}`);

  let deliveryAddress: JsonRecord | null = null;
  if (cardType === 'PHYSICAL') {
    deliveryAddress = (payload.deliveryAddress ?? {}) as JsonRecord;
    const missingDelivery = requiredAddress.filter((field) => !text(deliveryAddress as JsonRecord, field));
    if (missingDelivery.length) {
      throw new Error(`Missing delivery address fields: ${missingDelivery.join(', ')}`);
    }
    if (payload.deliveryAddressConfirmed !== true) {
      throw new Error('Confirm the physical card delivery address before creating the card.');
    }
  }

  const card = {
    id: `card_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
    last4: randomInt(0, 10000).toString().padStart(4, '0'),
    cardholderName: `${text(cardholder, 'firstName')} ${text(cardholder, 'lastName')}`,
    type: cardType,
    schemeNetwork: 'Visa',
    currency: 'SGD',
    status: 'ACTIVE',
    balance: 0,
    billingAddress,
    deliveryAddress,
    fulfillmentStatus: cardType === 'PHYSICAL' ? 'PROCESSING' : 'ISSUED',
  };

  return {
    commissionBalance: number(payload, 'commissionBalance'),
    walletBalance,
    cardholder,
    cards: [card],
    transactions: [],
    card,
    api: 'VCCHUB demo · create card',
  };
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'The request could not be completed.';
  return Response.json({ error: message }, { status: 400 });
}
