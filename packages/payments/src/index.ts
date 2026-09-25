/**
 * @doulisha/payments: the PaymentProvider interface and its implementations.
 * Phase 2: `mock` (simulated online gateway) and `manual` (cash, transfer, D17).
 * Konnect and Flouci are added in Phase 6 behind the same interface.
 */
export * from './manual';
export * from './mock';
export * from './signature';
export * from './types';
