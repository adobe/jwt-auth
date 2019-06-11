// MOCKS ////////////////////////////////////////////

const mockAccessToken = 'asdasdasd';

let jwt = require('jsonwebtoken');
let jwtActual = require.requireActual('jsonwebtoken');
jest.mock('jsonwebtoken', () => jest.fn());

let mockResultSuccess = Promise.resolve({
  ok: true,
  json: () =>
    Promise.resolve({ access_token: mockAccessToken, expires_in: 123456 })
});
let mockResultFailure = Promise.resolve({
  ok: false,
  json: () =>
    Promise.resolve({
      error: 'my_error_code',
      error_description: 'This is the error description.'
    })
});
let mockResultFailureUnknown = Promise.resolve({
  ok: false,
  json: () => Promise.resolve({ foo: 'bar', baz: 'faz' })
});

let fetch = require('node-fetch');
jest.mock('node-fetch', () => jest.fn());

// ////////////////////////////////////////////

const auth = require('../index');

const clientId = '9x4f87e5xxxf46x68f68x46ee6ef2738';
const clientSecret = 'f39b8de7-35f5-4fc3-8615-f0561214x27d';
const technicalAccountId = '53D840225B758DD00X495D9B@techacct.adobe.com';
const orgId = 'C74F69D7594880280X495D09@AdobeOrg';
const metaScopes = ['ent_dataservices_sdk'];
const privateKey = 'aalsdjfajsldjfalsjkdfa;lsjf;aljs';

describe('Validate input', () => {
  test('all parameters missing', () => {
    expect.assertions(1);
    return expect(auth({})).rejects.toThrow(
      'Required parameter(s) clientId, technicalAccountId, orgId, clientSecret, privateKey, metaScopes are missing'
    );
  });
  test('missing clientId', () => {
    expect.assertions(1);
    return expect(
      auth({ clientSecret, technicalAccountId, orgId, metaScopes, privateKey })
    ).rejects.toThrow('Required parameter(s) clientId are missing');
  });
  test('missing clientSecret', () => {
    expect.assertions(1);
    return expect(
      auth({ clientId, technicalAccountId, orgId, metaScopes, privateKey })
    ).rejects.toThrow('Required parameter(s) clientSecret are missing');
  });
  test('missing technicalAccountId', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        orgId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrow('Required parameter(s) technicalAccountId are missing');
  });
  test('missing orgId', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrow('Required parameter(s) orgId are missing');
  });
  test('missing metaScopes', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        privateKey
      })
    ).rejects.toThrow('Required parameter(s) metaScopes are missing');
  });
  test('missing privateKey', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes
      })
    ).rejects.toThrow('Required parameter(s) privateKey are missing');
  });
});

describe('Sign with invalid primary key', () => {
  beforeEach(() => {
    jwt.sign = jest.fn().mockImplementation((...args) => {
      // call actual jwt module, not mocked version
      return jwtActual.sign(...args);
    });
  });

  afterEach(() => {
    jwt.sign.mockClear();
  });

  test('invalid primary key', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrowError(/no start line/);
  });
});

describe('Fetch jwt', () => {
  beforeEach(() => {
    jwt.sign = jest.fn().mockImplementation(() => {
      return 'my_jwt_token';
    });
  });

  afterEach(() => {
    jwt.sign.mockClear();
  });

  test('valid jwt', () => {
    fetch.mockImplementation(() => mockResultSuccess);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).resolves.toEqual({ access_token: mockAccessToken, expires_in: 123456 });
  });

  test('invalid jwt, expected endpoint error', () => {
    expect.assertions(1);
    fetch.mockImplementation(() => mockResultFailure);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrow('my_error_code: This is the error description.');
  });

  test('invalid jwt, unknown error', () => {
    expect.assertions(1);
    fetch.mockImplementation(() => mockResultFailureUnknown);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrow(
      'An unknown error occurred while swapping jwt. The response is as follows: {"foo":"bar","baz":"faz"}'
    );
  });
});
