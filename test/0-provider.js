// Tests for the Provider class main methods
// Cvmcosta 2020

// Mostly borrowed from: https://github.com/Cvmcosta/ltijs/blob/664f25aa3f6c71f0592a02c6d5c394211b7dac55/test/0-provider.js

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.use(chaiHttp);

const expect = chai.expect;
const path = require('path');

// Use Firebase Emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const lti = require('ltijs').Provider;
const Platform = require('../node_modules/ltijs/dist/Utils/Platform');
const { default: Firestore } = require('../dist/Firestore');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const appRoute = '/approute';
const loginRoute = '/loginroute';
const keysetRoute = '/keysetroute';
const dynRegRoute = '/register';

describe('Firestore Get', function () {
  this.timeout(10000);

  it('Retrieves item and createdAt if ENCRYPTIONKEY is passed in', async () => {
    const db = new Firestore();
    await db.Insert(
      'LTIKEY',
      'widgets',
      { foo: 'bar-1' },
      { id: 'id-1' },
    );

    const result = await db.Get('LTIKEY', 'widgets', {
      id: 'id-1',
    });

    expect(result.length).to.equal(1);
    expect(Object.keys(result[0]).length).to.equal(2); // If ENCRYPTIONKEY is passed in, only item and createdAt are returned
    expect(result[0].foo).to.equal('bar-1');
    expect(result[0].createdAt).to.be.a('number');
  });

  it('Index is ignored if ENCRYPTIONKEY is not passed in', async () => {
    const db = new Firestore();
    await db.Insert(
      false,
      'widgets',
      { foo: 'bar-2' },
      { id: 'id-2' },
    );

    const result = await db.Get(false, 'widgets', {
      id: 'id-2',
    });

    expect(result).to.equal(false);
  });

  it('Query by item if if ENCRYPTIONKEY is not passed in', async () => {
    const db = new Firestore();
    await db.Insert(false, 'widgets', { id: 'id-3', name: 'tyson' });

    const result = await db.Get(false, 'widgets', {
      id: 'id-3',
    });

    expect(result.length).to.equal(1);
    expect(Object.keys(result[0]).length).to.equal(3);
    expect(result[0].id).to.equal('id-3');
    expect(result[0].name).to.equal('tyson');
    expect(result[0].createdAt).to.be.ok;
  });

  it('Returns multiple results for multiple matches', async () => {
    const db = new Firestore();
    await db.Insert(
      'LTIKEY',
      'widgets',
      { platformName: 'Adara' },
      { platformId: 'platform-1', location: 'Vancouver', count: 1 },
    );

    await db.Insert(
      'LTIKEY',
      'widgets',
      { platformName: 'Arius' },
      { platformId: 'platform-1', location: 'Vancouver', count: 2 },
    );

    const result = await db.Get('LTIKEY', 'widgets', {
      platformId: 'platform-1',
      location: 'Vancouver',
    });

    expect(result.length).to.equal(2);
    expect(['Adara', 'Arius']).to.include(result[0].platformName);
    expect(['Adara', 'Arius']).to.include(result[1].platformName);
    expect(result[0].platformName).to.not.equal(
      result[1].platformName,
    );
  });

  it('Returns exact match only', async () => {
    const db = new Firestore();
    await db.Insert(
      'LTIKEY',
      'widgets',
      { platformName: 'Acantha' },
      { platformId: 'platform-2', location: 'Burnaby' },
    );

    await db.Insert(
      'LTIKEY',
      'widgets',
      { platformName: 'Acestes' },
      { platformId: 'platform-2', location: 'Coquitlam' },
    );

    const result = await db.Get('LTIKEY', 'widgets', {
      platformId: 'platform-2',
      location: 'Coquitlam',
    });

    expect(result.length).to.equal(1);
    expect(result[0].platformName).to.equal('Acestes');
  });
});

describe('Testing Provider', function () {
  this.timeout(10000);

  // Testing setup flag
  it('Provider.deploy expected to throw error when Provider not setup', async () => {
    await expect(lti.deploy({ silent: true })).to.be.rejectedWith(
      Error,
    );
  });

  // Setting up provider
  it('Provider.setup expected to not throw Error', () => {
    const fn = () => {
      lti.setup(
        'LTIKEY',
        { plugin: new Firestore() },
        {
          appRoute: appRoute,
          loginRoute: loginRoute,
          keysetRoute: keysetRoute,
          dynRegRoute: dynRegRoute,
          staticPath: path.join(__dirname, '/views/'),
          devMode: false,
          dynReg: {
            url: 'https://tool.example.com',
            name: 'Tool Name',
            logo: 'https://tool.example.com/assets/logo.svg',
            customParameters: { a: 'b' },
            redirectUris: ['https://tool.example.com/launch'],
          },
        },
      );
      return lti;
    };
    expect(fn).to.not.throw(Error);
  });
  it('Provider.setup expected to throw Error when already setup', () => {
    const fn = () => {
      lti.setup(
        'LTIKEY',
        { plugin: new Firestore() },
        {
          appRoute: appRoute,
          loginRoute: loginRoute,
          keysetRoute: keysetRoute,
          dynRegRoute: dynRegRoute,
          staticPath: path.join(__dirname, '/views/'),
          devMode: false,
        },
      );
      return lti;
    };
    expect(fn).to.throw(Error);
  });
  it('Provider.registerPlatform expected to throw error when Provider not deployed', async () => {
    await expect(
      lti.registerPlatform({
        url: 'http://localhost/moodle',
        name: 'Platform Name',
        clientId: 'ClientId1',
        authenticationEndpoint:
          'http://localhost/moodle/AuthorizationUrl',
        accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
        authConfig: {
          method: 'INVALID_METHOD',
          key: 'http://localhost/moodle/keyset',
        },
      }),
    ).to.be.rejectedWith(Error);
  });
  it('Provider.appRoute expected to return registered route', () => {
    expect(lti.appRoute()).to.be.a('string').equal(appRoute);
  });
  it('Provider.loginRoute expected to return registered route', () => {
    expect(lti.loginRoute()).to.be.a('string').equal(loginRoute);
  });
  it('Provider.keysetRoute expected to return registered route', () => {
    expect(lti.keysetRoute()).to.be.a('string').equal(keysetRoute);
  });
  it('Provider.deploy expected to resolve true', async () => {
    await expect(
      lti.deploy({ silent: true, port: 3001 }),
    ).to.eventually.become(true);
  });
  it('Cleaning environment and preparing for registration tests', () => {
    return expect(
      lti.deletePlatform('http://localhost/moodle', 'ClientId1'),
    ).to.eventually.become(true);
  });
  it('Provider.registerPlatform expected to throw error when missing argument', async () => {
    await expect(
      lti.registerPlatform({
        url: 'http://localhost/moodle',
        name: 'Platform Name',
        authenticationEndpoint:
          'http://localhost/moodle/AuthorizationUrl',
        accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
        authConfig: {
          method: 'JWK_SET',
          key: 'http://localhost/moodle/keyset',
        },
      }),
    ).to.be.rejectedWith(Error);
  });
  it('Provider.registerPlatform expected to throw error when invalid auth config method is passed', async () => {
    await expect(
      lti.registerPlatform({
        url: 'http://localhost/moodle',
        name: 'Platform Name',
        clientId: 'ClientId1',
        authenticationEndpoint:
          'http://localhost/moodle/AuthorizationUrl',
        accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
        authConfig: {
          method: 'INVALID_METHOD',
          key: 'http://localhost/moodle/keyset',
        },
      }),
    ).to.be.rejectedWith(Error);
  });
  it('Provider.registerPlatform expected to resolve Platform object', () => {
    return expect(
      lti.registerPlatform({
        url: 'http://localhost/moodle',
        name: 'Platform Name',
        clientId: 'ClientId1',
        authenticationEndpoint:
          'http://localhost/moodle/AuthorizationUrl1',
        accesstokenEndpoint:
          'http://localhost/moodle/AccessTokenUrl1',
        authConfig: {
          method: 'JWK_SET',
          key: 'http://localhost/moodle/keyset1',
        },
      }),
    ).to.eventually.be.instanceOf(Platform);
  });
  it('Provider.registerPlatform with same Url and different Clientid expected to resolve Platform object', () => {
    return expect(
      lti.registerPlatform({
        url: 'http://localhost/moodle',
        name: 'Platform Name 2',
        clientId: 'ClientId2',
        authenticationEndpoint:
          'http://localhost/moodle/AuthorizationUrl1',
        accesstokenEndpoint:
          'http://localhost/moodle/AccessTokenUrl1',
        authConfig: {
          method: 'JWK_SET',
          key: 'http://localhost/moodle/keyset1',
        },
      }),
    ).to.eventually.be.instanceOf(Platform);
  });
  it('Provider.registerPlatform expected to apply changes to registered Platform object', async () => {
    const name = 'New platform name';
    const plat = await lti.registerPlatform({
      url: 'http://localhost/moodle',
      clientId: 'ClientId1',
      name: name,
    });
    return expect(plat.platformName()).to.eventually.become(name);
  });
  it('Provider.getPlatform expected to resolve Platform object', async () => {
    await expect(
      lti.getPlatform('http://localhost/moodle', 'ClientId1'),
    ).to.eventually.be.instanceOf(Platform);
    return expect(
      lti.getPlatform('http://localhost/moodle', 'ClientId2'),
    ).to.eventually.be.instanceOf(Platform);
  });
  it('Provider.getPlatformById expected to resolve Platform object', async () => {
    const platform = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    const platformId = await platform.platformId();
    await expect(
      lti.getPlatformById(platformId),
    ).to.eventually.be.instanceOf(Platform);
  });
  it('Provider.getAllPlatforms expected to resolve Array containing registered platforms', async () => {
    const plats = await lti.getAllPlatforms();
    await expect(plats).to.not.be.empty;
    await expect(plats[0]).to.be.instanceOf(Platform);
  });
  it('Provider.deletePlatform expected to return true and delete the platform', async () => {
    await lti.registerPlatform({
      url: 'http://localhost/moodle2',
      name: 'Platform Name 2',
      clientId: 'ClientId2',
      authenticationEndpoint:
        'http://localhost/moodle/AuthorizationUrl2',
      accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl2',
      authConfig: {
        method: 'JWK_SET',
        key: 'http://localhost/moodle/keyset2',
      },
    });
    await expect(
      lti.getPlatform('http://localhost/moodle2', 'ClientId2'),
    ).to.eventually.be.instanceOf(Platform);
    await expect(
      lti.deletePlatform('http://localhost/moodle2', 'ClientId2'),
    ).to.eventually.become(true);
    await expect(
      lti.getPlatform('http://localhost/moodle2', 'ClientId2'),
    ).to.eventually.become(false);
  });
  it('Provider.deletePlatform with clientID expected to return true and delete the platform', async () => {
    await expect(
      lti.getPlatform('http://localhost/moodle', 'ClientId2'),
    ).to.eventually.be.instanceOf(Platform);
    await expect(
      lti.deletePlatform('http://localhost/moodle', 'ClientId2'),
    ).to.eventually.become(true);
    await expect(
      lti.getPlatform('http://localhost/moodle', 'ClientId2'),
    ).to.eventually.become(false);
  });
  it('Provider.deletePlatformById expected to return true and delete the platform', async () => {
    const platform = await lti.registerPlatform({
      url: 'http://localhost/moodle3',
      name: 'Platform Name 3',
      clientId: 'ClientId3',
      authenticationEndpoint:
        'http://localhost/moodle/AuthorizationUrl2',
      accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl2',
      authConfig: {
        method: 'JWK_SET',
        key: 'http://localhost/moodle/keyset2',
      },
    });
    const platformId = await platform.platformId();
    await expect(
      lti.getPlatformById(platformId),
    ).to.eventually.be.instanceOf(Platform);
    await expect(
      lti.deletePlatformById(platformId),
    ).to.eventually.become(true);
    await expect(
      lti.getPlatformById(platformId),
    ).to.eventually.become(false);
  });
  it('Platform.platformUrl expected to return platform url', async () => {
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    return expect(plat.platformUrl()).to.eventually.become(
      'http://localhost/moodle',
    );
  });
  it('Platform.platformId expected to return platformId string', async () => {
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    return expect(plat.platformId()).to.eventually.be.a('string');
  });
  it('Platform.platformKid expected to return platform kid string', async () => {
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    return expect(plat.platformKid()).to.eventually.be.a('string');
  });
  it('Platform.platformPublicKey expected to return publickey string', async () => {
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    return expect(plat.platformPublicKey()).to.eventually.be.a(
      'string',
    );
  });
  it('Platform.platformPrivateKey expected to return privatekey string', async () => {
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    return expect(plat.platformPrivateKey()).to.eventually.be.a(
      'string',
    );
  });
  it('Platform.platformName expected to alter platform name', async () => {
    const value = 'Platform name';
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    await plat.platformName(value);
    return expect(plat.platformName()).to.eventually.become(value);
  });
  it('Platform.platformClientId expected to return platform client id', async () => {
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    return expect(plat.platformClientId()).to.eventually.become(
      'ClientId1',
    );
  });
  it('Platform.platformAuthConfig expected to alter platform auth configuration', async () => {
    const value = {
      method: 'JWK_SET',
      key: 'http://localhost/moodle/keyset',
    };
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    await plat.platformAuthConfig(value.method, value.key);
    return expect(plat.platformAuthConfig()).to.eventually.become(
      value,
    );
  });
  it('Platform.platformAuthenticationEndpoint expected to alter platform authentication endpoint', async () => {
    const value = 'http://localhost/moodle/AuthorizationUrl';
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    await plat.platformAuthenticationEndpoint(value);
    return expect(
      plat.platformAuthenticationEndpoint(),
    ).to.eventually.become(value);
  });
  it('Platform.platformAccessTokenEndpoint expected to alter platform access token endpoint', async () => {
    const value = 'http://localhost/moodle/AccessTokenUrl';
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    await plat.platformAccessTokenEndpoint(value);
    return expect(
      plat.platformAccessTokenEndpoint(),
    ).to.eventually.become(value);
  });
  it('Platform.platformAuthorizationServer expected to alter platform authorizaion server', async () => {
    const plat = await lti.getPlatform(
      'http://localhost/moodle',
      'ClientId1',
    );
    const value1 = await plat.platformAccessTokenEndpoint();
    const value2 = 'http://localhost/moodle/AccessTokenUrlAud';
    expect(plat.platformAuthorizationServer()).to.eventually.become(
      value1,
    );
    await plat.platformAuthorizationServer(value2);
    return expect(
      plat.platformAuthorizationServer(),
    ).to.eventually.become(value2);
  });
  it('Provider.onConnect expected to throw error when receiving no callback', () => {
    const fn = () => {
      return lti.onConnect();
    };
    expect(fn).to.throw(Error);
  });

  it('Provider.onConnect expected to not throw error when receiving callback', () => {
    const fn = () => {
      return lti.onConnect((conn, req, res) => {
        res.status(200).send('It works!');
      });
    };
    expect(fn).to.not.throw(Error);
  });
  it('Provider.onDeepLinking expected to throw error when receiving no callback', () => {
    const fn = () => {
      return lti.onDeepLinking();
    };
    expect(fn).to.throw(Error);
  });

  it('Provider.onDeepLinking expected to not throw error when receiving callback', () => {
    const fn = () => {
      return lti.onDeepLinking((req, res) => {
        res.status(200).send('It works!');
      });
    };
    expect(fn).to.not.throw(Error);
  });
  it('Provider.onSessionTimeout expected to throw error when receiving no callback', () => {
    const fn = () => {
      return lti.onSessionTimeout();
    };
    expect(fn).to.throw(Error);
  });

  it('Provider.onSessionTimeout expected to not throw error when receiving callback', () => {
    const fn = () => {
      return lti.onSessionTimeout((req, res) => {
        res.status(401).send('Session Timeout!');
      });
    };
    expect(fn).to.not.throw(Error);
  });
  it('Provider.onInvalidToken expected to throw error when receiving no callback', () => {
    const fn = () => {
      return lti.onInvalidToken();
    };
    expect(fn).to.throw(Error);
  });

  it('Provider.onInvalidToken expected to not throw error when receiving callback', () => {
    const fn = () => {
      return lti.onInvalidToken((req, res) => {
        res.status(401).send('Invalid token!');
      });
    };
    expect(fn).to.not.throw(Error);
  });
  it('Provider.onUnregisteredPlatform expected to throw error when receiving no callback', () => {
    const fn = () => {
      return lti.onUnregisteredPlatform();
    };
    expect(fn).to.throw(Error);
  });

  it('Provider.onUnregisteredPlatform expected to not throw error when receiving callback', () => {
    const fn = () => {
      return lti.onUnregisteredPlatform((req, res) => {
        return res.status(400).send({
          status: 400,
          error: 'Bad Request',
          details: { message: 'Unregistered Platform!' },
        });
      });
    };
    expect(fn).to.not.throw(Error);
  });
  it('Provider.onInactivePlatform expected to throw error when receiving no callback', () => {
    const fn = () => {
      return lti.onInactivePlatform();
    };
    expect(fn).to.throw(Error);
  });

  it('Provider.onInactivePlatform expected to not throw error when receiving callback', () => {
    const fn = () => {
      return lti.onInactivePlatform((req, res) => {
        return res.status(401).send({
          status: 401,
          error: 'Unauthorized',
          details: { message: 'Platform not active!' },
        });
      });
    };
    expect(fn).to.not.throw(Error);
  });
});
