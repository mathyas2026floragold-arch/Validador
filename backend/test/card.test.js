import test from 'node:test';
import assert from 'node:assert/strict';
import { onlyDigits, luhnCheck, detectBrand, maskCard, safeCardPayload } from '../src/utils/card.js';

test('onlyDigits remove caracteres não numéricos', () => {
  assert.equal(onlyDigits('4111 1111-1111.1111'), '4111111111111111');
});

test('luhnCheck valida número de teste Visa', () => {
  assert.equal(luhnCheck('4111111111111111'), true);
});

test('luhnCheck rejeita número alterado', () => {
  assert.equal(luhnCheck('4111111111111112'), false);
});

test('detectBrand detecta Visa e Mastercard', () => {
  assert.equal(detectBrand('4111111111111111'), 'Visa');
  assert.equal(detectBrand('5555555555554444'), 'Mastercard');
});

test('maskCard não retorna PAN completo', () => {
  assert.equal(maskCard('4111111111111111'), '41111111****1111');
});

test('safeCardPayload retorna campos seguros', () => {
  const payload = safeCardPayload('4111 1111 1111 1111');
  assert.equal(payload.bin8, '41111111');
  assert.equal(payload.last4, '1111');
  assert.equal(payload.masked, '41111111****1111');
  assert.equal(Object.hasOwn(payload, 'cardNumber'), false);
});
