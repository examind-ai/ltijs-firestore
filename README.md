<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="https://raw.githubusercontent.com/Cvmcosta/ltijs/master/docs/logo-300.svg"></img></a>
</div>

> LTIJS Firestore plugin.

# Introduction

This package allows [LTIJS](https://cvmcosta.github.io/ltijs) to work with Firestore instead of MongoDB.

# Installation

```
npm install @examind/ltijs-firestore
```

Register the plugin during [LTIJS](https://cvmcosta.github.io/ltijs) setup:

```
import Firestore from '@examind/ltijs-firestore';

lti.setup(
  'LTIKEY',
  { plugin: new Firestore() }
);

```

## Firestore Authentication

The `firebase-admin` library that's used in this package looks for a `GOOGLE_APPLICATION_CREDENTIALS` environment variable. That environment variable needs to point to a GCP Service Account key with access to Firestore. For simplicity, you can use the Firebase Admin SDK private key from Firebase Console:

- Select your project from [Firebase Console](https://console.firebase.google.com/)
- Go to `Project Settings` -> `Service accounts`, then download a new private key:

![image](https://user-images.githubusercontent.com/504505/154392946-8bb689c5-e68a-41f8-8981-862246ea4a00.png)

Save that file somewhere (e.g. `./service-account.json`), then point `GOOGLE_APPLICATION_CREDENTIALS` to that file. If you use [dotenv](https://www.npmjs.com/package/dotenv), then your `.env` file will look like this:

```
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

If you prefer to hard code the environment variable inside a Node.js file, you can do this:

```
process.env.GOOGLE_APPLICATION_CREDENTIALS = './service-account.json'
```

## Principle of Least Privilege

As an alternative to using the Firebase Admin SDK private key, you can choose to only grant the necessary permissions to `@examind/ltijs-firestore`. To do this, [create a custom service account](https://cloud.google.com/iam/docs/creating-managing-service-accounts) with only the `Cloud Datastore User` role and use its key instead.

## Purging Stale Documents

The default detabase provider of LTIJS uses MongoDB as its storage layer and it's configured to automatically purge stale documents. Using `@examind/ltijs-firestore` alone will not do that for Firestore. You must also use [@examind/ltijs-firestore-scheduler](https://www.npmjs.com/package/@examind/ltijs-firestore-scheduler).

# Contribution

If you find a bug or think that something is hard to understand, please open an issue. Pull requests are also welcome 🙂

## Unit Test

Running unit tests requires that the Firebase CLI (`firebase-tools`) is installed globally:

```
npm install -g firebase-tools@10.0.1
npm ci
npm run compile
npm test
```

To use VS Code's debugger:

- Open VS Code's `JavaScript Debug Terminal`
- Add breakpoints in `0-provider.js` or `Firestore.ts`
- Then `npm test` inside `JavaScript Debug Terminal`

# Publish

- Bump version in package.json
- `npm install`
- Commit with message: `Release {version, e.g. 0.1.6}`
