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

function olyLifeOfficeAddress(): JsonRecord {
  return {
    country: process.env.OLYLIFE_OFFICE_COUNTRY ?? 'Singapore',
    state: process.env.OLYLIFE_OFFICE_STATE ?? 'Singapore',
    city: process.env.OLYLIFE_OFFICE_CITY ?? 'Singapore',
    address: process.env.OLYLIFE_OFFICE_ADDRESS ?? 'OlyLife Head Office',
    postalCode: process.env.OLYLIFE_OFFICE_POSTAL_CODE ?? '018956',
    source: 'VCCHUB configured OlyLife office address',
  };
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
      country: text(payload, 'country'),
      email: text(payload, 'email'),
      phone: text(payload, 'phone'),
      memberId: text(payload, 'memberId'),
      registeredAddress: (payload.registeredAddress ?? null) as JsonRecord | null,
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
    return { conflict: true, error: 'Insufficient OlyLife commission balance.' };
  }

  return {
    commissionBalance: Math.round((commissionBalance - amount) * 100) / 100,
    walletBalance: Math.round((walletBalance + amount) * 100) / 100,
    cardholder: payload.cardholder ?? null,
    cards: Array.isArray(payload.cards) ? payload.cards : [],
    transactions: [
      {
        id: `top_${randomUUID().replaceAll('-', '').slice(0, 10)}`,
        type: 'OlyLife commission top-up',
        amount,
        status: 'COMPLETED',
      },
    ],
    apiTrace: [
      'VCCHUB → OlyLife: check commission balance',
      'OlyLife: commission debit approved',
      'OlyLife → VCCHUB: wallet credit completed',
    ],
  };
}

export function createCard(payload: JsonRecord) {
  const walletBalance = number(payload, 'walletBalance');
  const cardLimit = 2;
  const existingCards = Array.isArray(payload.cards) ? payload.cards as JsonRecord[] : [];
  const activeCards = existingCards.filter((card) => text(card, 'status').toUpperCase() !== 'CANCELLED');
  const slotsUsed = activeCards.length;
  const cardType = text(payload, 'cardType').toUpperCase() || 'VIRTUAL';
  if (walletBalance <= 0) {
    return { conflict: true, error: 'Top up the wallet before creating a card.' };
  }
  if (!['VIRTUAL', 'PHYSICAL'].includes(cardType)) {
    throw new Error('Card type must be VIRTUAL or PHYSICAL.');
  }
  if (activeCards.some((card) => text(card, 'type').toUpperCase() === cardType)) {
    const label = cardType === 'PHYSICAL' ? 'physical' : 'virtual';
    return { conflict: true, error: `An active ${label} card already exists. Only one active card of each type is allowed.` };
  }
  if (slotsUsed >= cardLimit) {
    return { conflict: true, error: `The card limit of ${cardLimit} active cards has been reached.` };
  }

  const cardholder = (payload.cardholder ?? {}) as JsonRecord;
  const billingAddress = (payload.billingAddress ?? {}) as JsonRecord;
  if (!text(cardholder, 'firstName') || !text(cardholder, 'lastName')) {
    throw new Error('Create the VCCHUB cardholder before creating a card.');
  }
  const requiredAddress = ['country', 'state', 'city', 'address', 'postalCode'];
  const missing = requiredAddress.filter((field) => !text(billingAddress, field));
  if (missing.length) throw new Error(`Missing billing address fields: ${missing.join(', ')}`);

  let deliveryAddress: JsonRecord | null = null;
  let deliveryRecipient: JsonRecord | null = null;
  if (cardType === 'PHYSICAL') {
    if (payload.useDefaultOlyLifeOfficeAddress === true) {
      deliveryAddress = olyLifeOfficeAddress();
      deliveryRecipient = {
        type: 'OLYLIFE_OFFICE',
        name: 'OlyLife Office',
        address: deliveryAddress,
      };
    } else {
      deliveryRecipient = (payload.deliveryRecipient ?? {}) as JsonRecord;
      const missingRecipient = ['firstName', 'lastName', 'phone'].filter(
        (field) => !text(deliveryRecipient as JsonRecord, field),
      );
      if (missingRecipient.length) {
        throw new Error(`Missing delivery recipient fields: ${missingRecipient.join(', ')}`);
      }
      deliveryAddress = (deliveryRecipient.address ?? payload.deliveryAddress ?? {}) as JsonRecord;
      const missingDelivery = requiredAddress.filter((field) => !text(deliveryAddress as JsonRecord, field));
      if (missingDelivery.length) {
        throw new Error(`Missing delivery address fields: ${missingDelivery.join(', ')}`);
      }
      if (payload.deliveryAddressConfirmed !== true) {
        throw new Error('Confirm the physical card delivery address before creating the card.');
      }
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
    deliveryRecipient,
    fulfillmentStatus: cardType === 'PHYSICAL' ? 'PROCESSING' : 'ISSUED',
  };

  return {
    commissionBalance: number(payload, 'commissionBalance'),
    walletBalance,
    cardholder,
    cardLimit,
    availableCardSlots: Math.max(0, cardLimit - slotsUsed - 1),
    cards: [card, ...existingCards],
    transactions: Array.isArray(payload.transactions) ? payload.transactions : [],
    card,
    api: 'VCCHUB demo · create card',
  };
}

export function topUpCard(payload: JsonRecord) {
  const amount = number(payload, 'amount');
  const walletBalance = number(payload, 'walletBalance');
  const cardId = text(payload, 'cardId');
  const cards = Array.isArray(payload.cards) ? payload.cards as JsonRecord[] : [];
  if (amount <= 0) throw new Error('Card top-up amount must be greater than zero.');
  if (amount > walletBalance) {
    return { conflict: true, error: 'Insufficient VCCHUB wallet balance.' };
  }
  if (!cardId) throw new Error('cardId is required.');
  const selectedCard = cards.find((card) => text(card, 'id') === cardId);
  if (!selectedCard) throw new Error('Card not found.');
  if (text(selectedCard, 'status').toUpperCase() !== 'ACTIVE') {
    return { conflict: true, error: 'Only an active card can be topped up.' };
  }

  const updatedCards = cards.map((card) =>
    text(card, 'id') === cardId
      ? { ...card, balance: Math.round((number(card, 'balance') + amount) * 100) / 100 }
      : card,
  );
  const transaction = {
    id: `ctx_${randomUUID().replaceAll('-', '').slice(0, 10)}`,
    type: 'Wallet to card top-up',
    cardId,
    amount,
    status: 'COMPLETED',
  };

  return {
    commissionBalance: number(payload, 'commissionBalance'),
    walletBalance: Math.round((walletBalance - amount) * 100) / 100,
    cardholder: payload.cardholder ?? null,
    cards: updatedCards,
    transactions: [transaction, ...(Array.isArray(payload.transactions) ? payload.transactions : [])],
    transaction,
    apiTrace: [
      'VCCHUB: check wallet balance',
      'VCCHUB: debit wallet balance',
      'VCCHUB: credit selected card balance',
    ],
  };
}

export function cancelCard(payload: JsonRecord) {
  const walletBalance = number(payload, 'walletBalance');
  const cardLimit = 2;
  const cardId = text(payload, 'cardId');
  const twoFactorCode = text(payload, 'twoFactorCode');
  const cards = Array.isArray(payload.cards) ? payload.cards as JsonRecord[] : [];
  if (!cardId) throw new Error('cardId is required.');
  if (twoFactorCode !== '123456') throw new Error('The 2FA code is incorrect.');

  const selectedCard = cards.find((card) => text(card, 'id') === cardId);
  if (!selectedCard) throw new Error('Card not found.');
  if (text(selectedCard, 'status').toUpperCase() === 'CANCELLED') {
    return { conflict: true, error: 'This card has already been cancelled.' };
  }
  if (text(selectedCard, 'status').toUpperCase() !== 'ACTIVE') {
    return { conflict: true, error: 'Only an active card can be cancelled.' };
  }

  const refundedAmount = number(selectedCard, 'balance');
  const cancelledAt = new Date().toISOString();
  const updatedCards = cards.map((card) =>
    text(card, 'id') === cardId
      ? {
          ...card,
          balance: 0,
          status: 'CANCELLED',
          cancelledAt,
          quotaConsumed: false,
        }
      : card,
  );
  const transaction = {
    id: `cnl_${randomUUID().replaceAll('-', '').slice(0, 10)}`,
    type: 'Card cancellation refund',
    cardId,
    amount: refundedAmount,
    status: 'COMPLETED',
  };
  const slotsUsed = updatedCards.filter((card) => text(card, 'status').toUpperCase() !== 'CANCELLED').length;

  return {
    commissionBalance: number(payload, 'commissionBalance'),
    walletBalance: Math.round((walletBalance + refundedAmount) * 100) / 100,
    cardLimit,
    availableCardSlots: Math.max(0, cardLimit - slotsUsed),
    cardholder: payload.cardholder ?? null,
    cards: updatedCards,
    transactions: [transaction, ...(Array.isArray(payload.transactions) ? payload.transactions : [])],
    transaction,
    cancellation: {
      cardId,
      status: 'CANCELLED',
      refundedAmount,
      refundDestination: 'VCCHUB_WALLET',
      quotaReleased: true,
      cancelledAt,
    },
    apiTrace: [
      'VCCHUB: validate active card and 2FA code',
      'VCCHUB: return remaining card balance to wallet',
      'VCCHUB: permanently cancel card and release one card-limit slot',
    ],
  };
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'The request could not be completed.';
  return Response.json({ error: message }, { status: 400 });
}
